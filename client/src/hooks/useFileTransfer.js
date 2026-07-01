import { useState, useRef, useCallback } from 'react';

const MAX_CHUNK_SIZE = 256 * 1024; // 256 KB (browser SCTP limit)
const PIPELINE_DEPTH = 50; // chunks in flight = 50 × 256KB = 12.5MB pipeline

export function useFileTransfer() {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [status, setStatus] = useState('idle');
  const [peakSpeed, setPeakSpeed] = useState(0);
  const startTimeRef = useRef(0);
  const abortedRef = useRef(false);
  const peakRef = useRef(0);

  const sendFile = useCallback(async (file, dataChannel, roomId, onComplete) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      setStatus('error');
      return;
    }

    abortedRef.current = false;
    const transferId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setStatus('sending');
    setProgress(0);
    setSpeed(0);
    setEta(0);

    const maxMsg = dataChannel.maxMessageSize || MAX_CHUNK_SIZE;
    const chunkSize = Math.min(MAX_CHUNK_SIZE, maxMsg);
    const totalChunks = Math.ceil(file.size / chunkSize);
    let ackCount = 0;
    let nextChunk = 0;
    let inFlight = 0;
    startTimeRef.current = Date.now();
    peakRef.current = 0;

    function sendNextChunk(idx) {
      if (idx >= totalChunks || abortedRef.current) return;
      if (dataChannel.readyState !== 'open') return;

      const start = idx * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const slice = file.slice(start, end);

      slice.arrayBuffer().then((chunkData) => {
        if (abortedRef.current || dataChannel.readyState !== 'open') return;

        const header = {
          type: 'chunk',
          transferId,
          chunkIndex: idx,
          totalChunks,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };

        try {
          dataChannel.send(JSON.stringify(header));
          dataChannel.send(chunkData);
        } catch (err) {
          console.error('Error sending chunk', idx, err);
          if (err.name === 'NetworkError') {
            setStatus('error');
          }
        }
      });
    }

    function fillPipeline() {
      while (nextChunk < totalChunks && inFlight < PIPELINE_DEPTH && !abortedRef.current) {
        const idx = nextChunk++;
        inFlight++;
        sendNextChunk(idx);
      }
    }

    dataChannel.onmessage = (e) => {
      if (typeof e.data !== 'string') return;

      try {
        const msg = JSON.parse(e.data);
        if (msg.type !== 'ack' || msg.transferId !== transferId) return;

        inFlight--;
        ackCount++;

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const bytesPerSec = ackCount * chunkSize / elapsed;
        setSpeed(bytesPerSec);

        if (bytesPerSec > peakRef.current) {
          peakRef.current = bytesPerSec;
          setPeakSpeed(bytesPerSec);
        }

        const pct = Math.min((ackCount / totalChunks) * 100, 100);
        setProgress(pct);

        if (bytesPerSec > 0) {
          const remaining = (totalChunks - ackCount) * chunkSize;
          setEta(remaining / bytesPerSec);
        }

        if (ackCount >= totalChunks) {
          setProgress(100);
          setStatus('completed');
          dataChannel.onmessage = null;
          if (onComplete) onComplete(transferId);
          return;
        }

        fillPipeline();
      } catch { /* ignore */ }
    };

    fillPipeline();
  }, []);

  const cancel = useCallback(() => {
    abortedRef.current = true;
    setStatus('cancelled');
    setProgress(0);
  }, []);

  return { sendFile, progress, speed, eta, status, peakSpeed, cancel };
}
