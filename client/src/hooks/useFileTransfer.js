/**
 * useFileTransfer.js
 *
 * Handles chunked file SENDING over a WebRTC DataChannel.
 *
 * File RECEIVING is handled globally in WebRTCContext.jsx so that any peer
 * can receive a file regardless of which page they are on.
 *
 * Key fixes applied:
 *   - Bug 1: ArrayBuffer.slice() is synchronous — removed the broken .then()
 *   - Bug 2: Capture chunkIndex as `idx` before the async sha256 call so the
 *             correct index is embedded in every chunk header
 *   - After sendFile completes, do NOT null-out dc.onmessage (the receive
 *     handler registered via addEventListener in WebRTCContext must survive)
 */

import { useState, useRef, useCallback } from 'react';

const CHUNK_SIZE = 64 * 1024; // 64 KB — must match WebRTCContext

async function sha256(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function useFileTransfer() {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [status, setStatus] = useState('idle');
  const startTimeRef = useRef(0);
  const abortedRef = useRef(false);

  /**
   * Send a file over an open WebRTC DataChannel.
   *
   * @param {File}          file        The File object to send
   * @param {RTCDataChannel} dataChannel An open DataChannel
   * @param {string}        roomId      Used only for metadata (not sent over DC)
   * @param {Function}      onComplete  Called with transferId when done
   */
  const sendFile = useCallback(async (file, dataChannel, roomId, onComplete) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.error('sendFile: DataChannel is not open', dataChannel?.readyState);
      setStatus('error');
      return;
    }

    abortedRef.current = false;
    const transferId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setStatus('sending');
    setProgress(0);
    setSpeed(0);
    setEta(0);
    startTimeRef.current = Date.now();

    // Read the entire file into an ArrayBuffer up front
    const fileBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const totalChunks = Math.ceil(fileBuffer.byteLength / CHUNK_SIZE);
    let ackCount = 0;
    let chunkIndex = 0;
    const maxInFlight = 10; // Flow control: max unacknowledged chunks

    // ── ACK handler ──────────────────────────────────────────────────────
    // Set via .onmessage so it can coexist with the receive handler that
    // WebRTCContext registered via addEventListener.
    dataChannel.onmessage = (e) => {
      if (typeof e.data !== 'string') return; // ignore binary on this side

      try {
        const msg = JSON.parse(e.data);
        if (msg.type !== 'ack' || msg.transferId !== transferId) return;

        ackCount++;

        // Progress / speed / ETA
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const chunksPerSec = elapsed > 0 ? ackCount / elapsed : 0;
        const bytesPerSec = chunksPerSec * CHUNK_SIZE;
        setSpeed(bytesPerSec);
        setProgress(Math.min((ackCount / totalChunks) * 100, 100));
        if (bytesPerSec > 0) {
          setEta(((totalChunks - ackCount) * CHUNK_SIZE) / bytesPerSec);
        }

        if (ackCount >= totalChunks) {
          setProgress(100);
          setStatus('completed');
          // Remove only the ACK listener — do NOT touch addEventListener handlers
          dataChannel.onmessage = null;
          if (onComplete) onComplete(transferId);
          return;
        }

        // Slide the window forward
        sendNextChunk();
      } catch { /* ignore non-JSON */ }
    };

    // ── chunk sender ──────────────────────────────────────────────────────
    function sendNextChunk() {
      while (
        chunkIndex < totalChunks &&
        chunkIndex < ackCount + maxInFlight &&
        !abortedRef.current
      ) {
        if (dataChannel.readyState !== 'open') break;

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileBuffer.byteLength);

        // FIX Bug 1: slice() is synchronous — just extract the buffer directly
        const chunkData = fileBuffer.slice(start, end);

        // FIX Bug 2: capture the index NOW before we increment the outer variable
        const idx = chunkIndex;
        chunkIndex++;

        // sha256 is async but chunkData and idx are safely captured above
        sha256(chunkData).then((checksum) => {
          if (abortedRef.current || dataChannel.readyState !== 'open') return;

          const header = {
            type: 'chunk',
            transferId,
            chunkIndex: idx,      // ← captured value, not the outer loop variable
            totalChunks,
            checksum,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          };

          try {
            dataChannel.send(JSON.stringify(header)); // 1st message: metadata (string)
            dataChannel.send(chunkData);              // 2nd message: binary body
          } catch (err) {
            console.error('Error sending chunk', idx, err);
          }
        });
      }
    }

    // Kick off initial window
    sendNextChunk();
  }, []);

  const cancel = useCallback(() => {
    abortedRef.current = true;
    setStatus('cancelled');
    setProgress(0);
  }, []);

  return { sendFile, progress, speed, eta, status, cancel };
}
