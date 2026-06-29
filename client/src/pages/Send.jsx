import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { useTransfer } from '../context/TransferContext';
import DropZone from '../components/DropZone';
import TransferProgress from '../components/TransferProgress';

export default function Send() {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { createOffer, connectionState, dataChannel, roomId, remoteBwId, waitForConnection, cleanup } = useWebRTC(socket, connected);
  const { sendFile, receiveFile, progress, speed, eta, status, cancel } = useFileTransfer();
  const { addTransfer, setIncomingFile } = useTransfer();

  const [targetBwId, setTargetBwId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidBwId, setIsValidBwId] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);

  const bwIdPattern = /^BW-[A-Z0-9]{6}$/;

  useEffect(() => {
    setIsValidBwId(bwIdPattern.test(targetBwId.toUpperCase()));
  }, [targetBwId]);

  useEffect(() => {
    receiveFile(dataChannel, setIncomingFile, addTransfer);
  }, [dataChannel, receiveFile, addTransfer, setIncomingFile]);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setIsComplete(false);
    setError(null);
    cancel();
  }, [cancel]);

  const handleSend = useCallback(async () => {
    if (!selectedFile || !isValidBwId || !socket || !connected) return;
    setError(null);
    setIsSending(true);
    setIsComplete(false);

    try {
      const token = await user.getIdToken();
      const rid = await createOffer(targetBwId.toUpperCase(), token);

      await waitForConnection();

      socket.emit('transfer-start', {
        roomId: rid,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      });

      await new Promise((resolve, reject) => {
        sendFile(selectedFile, dataChannel, rid, (transferId) => {
          addTransfer({
            transferId,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type,
            peerBwId: targetBwId.toUpperCase(),
            status: 'completed',
            timestamp: new Date().toISOString(),
            direction: 'sent',
          });
          setIsComplete(true);
          setIsSending(false);
          socket.emit('transfer-complete', { roomId: rid, transferId });
          resolve();
        });
      });
    } catch (e) {
      console.error('Send error:', e);
      setError(e.message || 'Transfer failed');
      setIsSending(false);
    }
  }, [selectedFile, isValidBwId, socket, connected, createOffer, waitForConnection, dataChannel, sendFile, addTransfer, targetBwId, user]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setIsComplete(false);
    setError(null);
    cancel();
    cleanup();
    setTargetBwId('');
  }, [cancel, cleanup]);

  return (
    <div className="flex-1 max-w-[700px] mx-auto px-8 py-10 space-y-8">
      <div>
        <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">Send a File</h1>
        <p className="text-bw-muted font-inter text-sm mt-1">
          Drop any file into the black hole. It goes directly to the recipient.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-bw-muted text-xs font-space-grotesk font-bold tracking-widest uppercase">
          Recipient's BlackWhole ID
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="BW-XXXXXX"
            value={targetBwId}
            onChange={(e) => setTargetBwId(e.target.value.toUpperCase().slice(0, 9))}
            className="w-full px-4 py-3 rounded-input bg-bw-surface border border-bw-border text-bw-purple-lt font-jetbrains-mono text-lg outline-none focus:border-bw-purple transition-colors"
            disabled={isSending || isComplete}
            style={{ letterSpacing: '0.1em' }}
          />
          {isValidBwId && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-bw-green text-lg">✓</span>
          )}
        </div>
      </div>

      <DropZone
        onFileSelect={handleFileSelect}
        dragOver={false}
        sending={isSending}
        progress={progress}
        completed={isComplete}
        peerBwId={targetBwId.toUpperCase()}
      />

      {selectedFile && !isSending && !isComplete && (
        <button
          onClick={handleSend}
          disabled={!isValidBwId}
          className="w-full py-4 rounded-button text-base font-inter font-semibold text-bw-white transition-all"
          style={{
            background: !isValidBwId ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            boxShadow: isValidBwId ? '0 0 25px rgba(124,58,237,0.3)' : 'none',
            cursor: isValidBwId ? 'pointer' : 'not-allowed',
            opacity: isValidBwId ? 1 : 0.5,
          }}
        >
          ⬛ Drop Into BlackWhole
        </button>
      )}

      {isSending && (
        <TransferProgress progress={progress} speed={speed} eta={eta} status={status} />
      )}

      {isComplete && (
        <button
          onClick={handleReset}
          className="w-full py-4 rounded-button text-base font-inter font-semibold text-bw-green border-2 border-bw-green hover:bg-bw-green/5 transition-all"
        >
          Send Another File
        </button>
      )}

      {error && (
        <div className="rounded-button bg-bw-red/10 border border-bw-red/30 p-4 text-bw-red text-sm font-inter">
          {error}
        </div>
      )}

      <div className="text-xs text-bw-muted font-inter text-center">
        {connected ? '🟢 Connected to signaling server' : '🔴 Connecting to signaling server...'}
      </div>
    </div>
  );
}
