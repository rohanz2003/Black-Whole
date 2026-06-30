import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { useTransfer } from '../context/TransferContext';
import DropZone from '../components/DropZone';
import TransferProgress from '../components/TransferProgress';
import { formatFileSize, getFileEmoji } from '../lib/fileUtils';

export default function Send() {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const location = useLocation();
  const retryState = location.state?.retryTransfer;
  const {
    createOffer,
    connectionState,
    dataChannelRef,
    roomId,
    remoteBwId,
    cleanup,
  } = useWebRTC();
  const { sendFile, progress, speed, eta, status, cancel } = useFileTransfer();
  const { addTransfer, addPending } = useTransfer();

  const [targetBwId, setTargetBwId] = useState(retryState?.peerBwId || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidBwId, setIsValidBwId] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState([]);
  const animFrameRef = useRef(null);

  const bwIdPattern = /^BW-[A-Z0-9]{6}$/;

  useEffect(() => {
    setIsValidBwId(bwIdPattern.test(targetBwId.toUpperCase()));
  }, [targetBwId]);

  const handleFileSelect = useCallback(
    (file) => {
      setSelectedFile(file);
      setIsComplete(false);
      setError(null);
      setPhase('idle');
      cancel();
    },
    [cancel]
  );

  useEffect(() => {
    if (!isSending || !selectedFile) return;
    setIsAnimating(true);
    const count = 12;
    const p = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 40,
        delay: i * 0.1,
        duration: 1 + Math.random() * 0.5,
        emoji: getFileEmoji(selectedFile.type),
      };
    });
    setParticles(p);
    const timer = setTimeout(() => setParticles([]), 2500);
    return () => {
      clearTimeout(timer);
      setParticles([]);
      setIsAnimating(false);
    };
  }, [isSending, selectedFile]);

  const handleSend = useCallback(async () => {
    if (!selectedFile || !isValidBwId || !socket || !connected) {
      if (!connected) {
        const pendingId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        addPending({
          transferId: pendingId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          peerBwId: targetBwId.toUpperCase(),
          direction: 'sent',
          status: 'pending',
          timestamp: new Date().toISOString(),
          file: selectedFile,
        });
        addTransfer({
          transferId: pendingId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          peerBwId: targetBwId.toUpperCase(),
          status: 'pending',
          timestamp: new Date().toISOString(),
          direction: 'sent',
        });
        setIsComplete(true);
        setError(null);
      }
      return;
    }

    setError(null);
    setIsSending(true);
    setPhase('connecting');

    try {
      const token = await user.getIdToken();

      setPhase('connecting');
      const { rid, connectionPromise } = await createOffer(targetBwId.toUpperCase(), token);

      setPhase('pulling');
      await connectionPromise;

      setPhase('sending');
      socket.emit('transfer-start', {
        roomId: rid,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      });

      const dc = dataChannelRef.current;
      if (!dc || dc.readyState !== 'open') {
        throw new Error('Data channel closed before transfer could start');
      }

      await new Promise((resolve, reject) => {
        sendFile(selectedFile, dc, rid, (transferId) => {
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
          setPhase('complete');

          socket.emit('transfer-complete', { roomId: rid, transferId });
          resolve();
        });
      });
    } catch (e) {
      console.error('Send error:', e);
      setError(e.message || 'Transfer failed. Please try again.');
      setIsSending(false);
      setPhase('error');
      cleanup();
    }
  }, [
    selectedFile, isValidBwId, socket, connected,
    createOffer, dataChannelRef, sendFile,
    addTransfer, addPending, targetBwId, user, cleanup,
  ]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setIsComplete(false);
    setError(null);
    setPhase('idle');
    cancel();
    cleanup();
    setTargetBwId('');
  }, [cancel, cleanup]);

  return (
    <div className={`flex-1 max-w-[700px] mx-auto px-8 py-10 page-enter`}>
      <div className="stagger-1">
        <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">
          Send a File
        </h1>
        <p className="text-bw-muted font-inter text-sm mt-1">
          Drop any file into the black hole. Direct peer-to-peer — no cloud, no limits.
        </p>
      </div>

      {/* Recipient BW-ID input */}
      <div className="mt-8 space-y-2 stagger-2">
        <label className="text-bw-muted text-xs font-space-grotesk font-bold tracking-widest uppercase">
          Recipient's BlackWhole ID
        </label>
        <div className="relative group">
          <input
            type="text"
            placeholder="BW-XXXXXX"
            value={targetBwId}
            onChange={(e) =>
              setTargetBwId(e.target.value.toUpperCase().slice(0, 9))
            }
            className="w-full px-4 py-3.5 rounded-input bg-bw-surface border text-bw-purple-lt font-jetbrains-mono text-lg outline-none transition-all duration-300"
            style={{
              borderColor: isValidBwId ? 'rgba(124,58,237,0.5)' : 'var(--bw-border)',
              letterSpacing: '0.1em',
              boxShadow: isValidBwId ? '0 0 15px rgba(124,58,237,0.15)' : 'none',
            }}
            disabled={isSending || isComplete}
          />
          {isValidBwId && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-bw-green text-lg animate-scaleIn">
              ✓
            </span>
          )}
        </div>
      </div>

      {/* Drop zone with black hole + file particles */}
      <div className={`mt-6 stagger-3 ${isSending ? '' : ''}`}>
        <div className="relative">
          {/* Floating file particles being sucked in */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none z-20 text-2xl"
              style={{
                left: `calc(50% + ${p.x}px)`,
                top: `calc(50% + ${p.y}px)`,
                animation: `particleSuck ${p.duration}s cubic-bezier(0.4, 0, 0.2, 1) ${p.delay}s forwards`,
              }}
            >
              {p.emoji}
            </div>
          ))}
          <DropZone
            onFileSelect={handleFileSelect}
            dragOver={false}
            sending={isSending}
            progress={progress}
            completed={isComplete}
            peerBwId={targetBwId.toUpperCase()}
          />
        </div>

        {/* Phase indicator */}
        {isSending && (
          <div className="flex items-center justify-center gap-2 mt-3 animate-fadeIn">
            <div className={`w-2 h-2 rounded-full ${
              phase === 'connecting' ? 'bg-bw-gold animate-breathe' :
              phase === 'pulling' ? 'bg-bw-purple animate-pulseGlow' :
              'bg-bw-cyan'
            }`} />
            <span className="text-xs font-jetbrains-mono text-bw-muted">
              {phase === 'connecting' && 'Connecting to peer...'}
              {phase === 'pulling' && '⬛ BlackWhole is pulling your file in...'}
              {phase === 'sending' && `Sending ${formatFileSize(selectedFile?.size || 0)}...`}
            </span>
          </div>
        )}
      </div>

      {/* Send button */}
      {selectedFile && !isSending && !isComplete && (
        <div className="mt-6 stagger-4">
          <button
            onClick={handleSend}
            disabled={!isValidBwId}
            className="w-full py-4 rounded-button text-base font-inter font-semibold text-bw-white transition-all duration-300 hover:scale-[1.02] active:scale-98"
            style={{
              background: !isValidBwId
                ? 'rgba(124,58,237,0.2)'
                : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              boxShadow: isValidBwId ? '0 0 30px rgba(124,58,237,0.25)' : 'none',
              cursor: isValidBwId ? 'pointer' : 'not-allowed',
              opacity: isValidBwId ? 1 : 0.5,
            }}
          >
            <span className="inline-block mr-2">⬛</span>
            Drop Into BlackWhole
          </button>
        </div>
      )}

      {/* Transfer progress */}
      {isSending && (
        <div className="mt-4 stagger-5">
          <TransferProgress progress={progress} speed={speed} eta={eta} status={status} />
        </div>
      )}

      {/* Post-send */}
      {isComplete && (
        <div className="mt-6 stagger-4">
          <button
            onClick={handleReset}
            className="w-full py-4 rounded-button text-base font-inter font-semibold text-bw-green border-2 border-bw-green/40 hover:bg-bw-green/5 transition-all hover:scale-[1.02] active:scale-98"
          >
            ✓ Send Another File
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 stagger-3">
          <div className="rounded-button bg-bw-red/10 border border-bw-red/30 p-4 text-bw-red text-sm font-inter animate-fadeIn">
            <span className="mr-2">⚠</span>
            {error}
          </div>
        </div>
      )}

      {/* Connection status */}
      <div className="mt-8 text-xs text-bw-muted font-inter text-center stagger-6">
        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
          connected ? 'bg-bw-green' : 'bg-bw-red animate-breathe'
        }`} />
        {connected
          ? 'Connected to signaling server'
          : 'Connecting to signaling server…'}
        {connectionState !== 'new' && connectionState !== 'connected' && (
          <span className="ml-2 text-bw-purple-lt">
            · WebRTC: {connectionState}
          </span>
        )}
      </div>
    </div>
  );
}
