import { useState, useRef, useCallback } from 'react';

const CHUNK_SIZE = 64 * 1024;

async function sha256(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useFileTransfer() {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [status, setStatus] = useState('idle');
  const chunksRef = useRef(new Map());
  const transferIdRef = useRef(null);
  const startTimeRef = useRef(0);
  const ackedRef = useRef(0);
  const totalRef = useRef(0);
  const abortedRef = useRef(false);

  const sendFile = useCallback(async (file, dataChannel, roomId, onComplete) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      setStatus('error');
      return;
    }

    abortedRef.current = false;
    const transferId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    transferIdRef.current = transferId;
    setStatus('sending');
    setProgress(0);
    startTimeRef.current = Date.now();
    ackedRef.current = 0;

    const reader = new FileReader();
    const fileBuffer = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const totalChunks = Math.ceil(fileBuffer.byteLength / CHUNK_SIZE);
    totalRef.current = totalChunks;

    let ackCount = 0;
    let chunkIndex = 0;
    const maxInFlight = 10;

    function sendNextChunk() {
      while (chunkIndex < totalChunks && chunkIndex < ackCount + maxInFlight) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileBuffer.byteLength);
        const chunk = fileBuffer.slice(start, end);

        chunk.slice(0).then(async (chunkData) => {
          const checksum = await sha256(chunkData);
          const header = {
            type: 'chunk',
            transferId,
            chunkIndex: chunkIndex,
            totalChunks,
            checksum,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          };

          try {
            dataChannel.send(JSON.stringify(header));
            dataChannel.send(chunkData);
          } catch (e) {
            console.error('Error sending chunk', chunkIndex, e);
          }
        });

        chunkIndex++;
      }
    }

    dataChannel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ack' && msg.transferId === transferId) {
          ackCount++;
          ackedRef.current = ackCount;

          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const chunksPerSec = ackCount / elapsed;
          const bytesPerSec = chunksPerSec * CHUNK_SIZE;
          setSpeed(bytesPerSec);
          setProgress(Math.min((ackCount / totalChunks) * 100, 100));

          const remainingBytes = (totalChunks - ackCount) * CHUNK_SIZE;
          if (bytesPerSec > 0) {
            setEta(remainingBytes / bytesPerSec);
          }

          if (ackCount >= totalChunks) {
            setProgress(100);
            setStatus('completed');
            if (onComplete) onComplete(transferId);
            dataChannel.onmessage = null;
            return;
          }

          sendNextChunk();
        }
      } catch (e) {
        console.error('Error parsing ACK:', e);
      }
    };

    dataChannel.onerror = (e) => {
      console.error('DataChannel error during send:', e);
    };

    sendNextChunk();
  }, []);

  const receiveFile = useCallback((dataChannel, setIncomingFile, addTransfer) => {
    if (!dataChannel) return;

    let currentTransfer = null;
    let chunks = new Map();
    let expectedTotal = 0;
    let headerInfo = null;

    dataChannel.onmessage = async (e) => {
      if (currentTransfer?.type === 'chunk') {
        const buf = e.data;
        chunks.set(currentTransfer.chunkIndex, buf);
        dataChannel.send(JSON.stringify({
          type: 'ack',
          transferId: currentTransfer.transferId,
          chunkIndex: currentTransfer.chunkIndex,
        }));

        if (chunks.size === expectedTotal) {
          const sortedChunks = [];
          for (let i = 0; i < expectedTotal; i++) {
            sortedChunks.push(chunks.get(i));
          }
          const blob = new Blob(sortedChunks, { type: headerInfo.mimeType });

          tryAutoSave(blob, headerInfo.fileName, headerInfo.mimeType);

          setIncomingFile(null);

          if (addTransfer) {
            addTransfer({
              transferId: currentTransfer.transferId,
              fileName: headerInfo.fileName,
              fileSize: headerInfo.fileSize,
              mimeType: headerInfo.mimeType,
              status: 'completed',
              timestamp: new Date().toISOString(),
              direction: 'received',
            });
          }

          chunks.clear();
          currentTransfer = null;
          headerInfo = null;
        }
        return;
      }

      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'chunk') {
          currentTransfer = msg;
          expectedTotal = msg.totalChunks;
          headerInfo = { fileName: msg.fileName, fileSize: msg.fileSize, mimeType: msg.mimeType };
          chunks = new Map();

          if (setIncomingFile) {
            setIncomingFile({
              fileName: msg.fileName,
              fileSize: msg.fileSize,
              mimeType: msg.mimeType,
              senderBwId: null,
              transferId: msg.transferId,
            });
          }
        }
      } catch (e) {
        console.error('Error processing incoming data:', e);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    abortedRef.current = true;
    chunksRef.current.clear();
    setStatus('cancelled');
    setProgress(0);
  }, []);

  return { sendFile, receiveFile, progress, speed, eta, status, cancel };
}

async function tryAutoSave(blob, fileName, mimeType) {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'File',
          accept: { [mimeType]: ['.' + fileName.split('.').pop()] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
