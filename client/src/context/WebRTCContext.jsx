/**
 * WebRTCContext.jsx
 *
 * Global WebRTC context — always mounted at App root so that:
 * 1. Receiver handles peer-offer on ANY page (not just /send)
 * 2. File receive is handled end-to-end (chunk reassembly + auto-save)
 * 3. dataChannelRef exposed so Send.jsx never has stale-state issues
 */

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from './AuthContext';
import { useTransfer } from './TransferContext';

const WebRTCContext = createContext(null);

const CHUNK_SIZE = 64 * 1024; // Must match useFileTransfer

// ─── helpers ────────────────────────────────────────────────────────────────

async function sha256(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function tryAutoSave(blob, fileName, mimeType) {
  try {
    if ('showSaveFilePicker' in window) {
      const ext = fileName.split('.').pop() || 'bin';
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'File',
            accept: { [mimeType || 'application/octet-stream']: ['.' + ext] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return; // User cancelled picker — don't fall through
  }

  // Fallback: programmatic download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ─── provider ───────────────────────────────────────────────────────────────

export function WebRTCProvider({ children }) {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const { setIncomingFile, addTransfer } = useTransfer();

  // Core refs — always have the live value regardless of renders
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const roomIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const resolveConnectionRef = useRef(null);
  const rejectConnectionRef = useRef(null);
  const tokenRef = useRef(null);       // cached token for receiver-side TURN
  const remoteBwIdRef = useRef(null); // live ref so ondatachannel closure is never stale

  // React state — drives UI re-renders
  const [connectionState, setConnectionState] = useState('new');
  const [remoteBwId, setRemoteBwId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);

  // Chat state
  const chatDcRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatConnected, setChatConnected] = useState(false);

  // ── TURN credentials ──────────────────────────────────────────────────────

  const getTurnCredentials = useCallback(async (token) => {
    if (!token) return null;
    try {
      const base =
        import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:4000';
      const res = await fetch(`${base}/api/turn-credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) return await res.json();
    } catch {
      console.warn('Failed to fetch TURN credentials — using STUN only');
    }
    return null;
  }, []);

  // ── chat handlers ──────────────────────────────────────────────────────────

  const setupChatDataChannel = useCallback((dc) => {
    dc.binaryType = 'arraybuffer';
    chatDcRef.current = dc;
    setChatConnected(true);

    dc.addEventListener('message', (e) => {
      if (typeof e.data !== 'string') return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'chat') {
          setChatMessages(prev => [...prev, {
            text: msg.text,
            sender: msg.sender || remoteBwIdRef.current,
            timestamp: msg.timestamp || new Date().toISOString(),
            direction: 'received',
          }]);
        }
      } catch { /* ignore */ }
    });

    dc.onclose = () => {
      chatDcRef.current = null;
      setChatConnected(false);
    };
  }, []);

  const sendChatMessage = useCallback((text) => {
    const dc = chatDcRef.current;
    if (!dc || dc.readyState !== 'open') return;
    const msg = JSON.stringify({
      type: 'chat',
      text,
      sender: user?.bwId || 'me',
      timestamp: new Date().toISOString(),
    });
    try {
      dc.send(msg);
      setChatMessages(prev => [...prev, {
        text,
        sender: user?.bwId || 'me',
        timestamp: new Date().toISOString(),
        direction: 'sent',
      }]);
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  }, [user?.bwId]);

  // ── cleanup ───────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (chatDcRef.current) {
      try { chatDcRef.current.close(); } catch { /* ignore */ }
      chatDcRef.current = null;
    }
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch { /* ignore */ }
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch { /* ignore */ }
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    if (rejectConnectionRef.current) {
      rejectConnectionRef.current(new Error('Connection was cleaned up'));
      rejectConnectionRef.current = null;
    }
    resolveConnectionRef.current = null;
    roomIdRef.current = null;
    remoteBwIdRef.current = null;
    tokenRef.current = null;
    setDataChannel(null);
    setConnectionState('new');
    setRemoteBwId(null);
    setRoomId(null);
    setChatConnected(false);
    setChatMessages([]);
  }, []);

  // ── file receive handler (receiver side only) ─────────────────────────────
  //
  // Called on the DC that arrives via ondatachannel (the receiver).
  // Uses addEventListener so it doesn't conflict with the sender's onmessage
  // ACK handler set by useFileTransfer.sendFile.

  const setupReceiveHandler = useCallback(
    (dc) => {
      let currentHeader = null; // metadata from the last JSON 'chunk' header
      let chunks = new Map();
      let expectedTotal = 0;
      let headerInfo = null;

      dc.addEventListener('message', async (e) => {
        // ── binary: chunk body ──────────────────────────────────────────
        if (e.data instanceof ArrayBuffer) {
          if (!currentHeader) return; // No header arrived yet — drop

          chunks.set(currentHeader.chunkIndex, e.data);

          // ACK every chunk so the sender can flow-control
          try {
            if (dc.readyState === 'open') {
              dc.send(
                JSON.stringify({
                  type: 'ack',
                  transferId: currentHeader.transferId,
                  chunkIndex: currentHeader.chunkIndex,
                })
              );
            }
          } catch (err) {
            console.error('Error sending ACK:', err);
          }

          currentHeader = null; // consumed — wait for next JSON header

          // ── all chunks received? assemble & save ──────────────────────
          if (chunks.size === expectedTotal) {
            const sortedChunks = [];
            for (let i = 0; i < expectedTotal; i++) {
              sortedChunks.push(chunks.get(i));
            }

            const blob = new Blob(sortedChunks, {
              type: headerInfo?.mimeType || 'application/octet-stream',
            });

            // Auto-save to disk
            tryAutoSave(blob, headerInfo.fileName, headerInfo.mimeType);

            // Clear incoming toast
            setIncomingFile(null);

            // Record in history
            addTransfer({
              transferId: headerInfo.transferId,
              fileName: headerInfo.fileName,
              fileSize: headerInfo.fileSize,
              mimeType: headerInfo.mimeType,
              status: 'completed',
              timestamp: new Date().toISOString(),
              direction: 'received',
            });

            // Reset state for next file
            chunks = new Map();
            headerInfo = null;
            expectedTotal = 0;
          }
          return;
        }

        // ── string: JSON header or other control message ────────────────
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === 'chunk') {
            currentHeader = msg;
            expectedTotal = msg.totalChunks;
            headerInfo = {
              transferId: msg.transferId,
              fileName: msg.fileName,
              fileSize: msg.fileSize,
              mimeType: msg.mimeType,
            };

            // Use the ref (not state) — remoteBwId state may not be committed
            // yet when ondatachannel fires, but the ref is always current.
            setIncomingFile({
              fileName: msg.fileName,
              fileSize: msg.fileSize,
              mimeType: msg.mimeType,
              senderBwId: remoteBwIdRef.current,
              transferId: msg.transferId,
            });
          }
          // Other JSON messages (e.g. from a future control channel) are ignored
        } catch {
          // Non-JSON string — ignore silently
        }
      });
    },
    [setIncomingFile, addTransfer] // remoteBwId removed — accessed via ref
  );

  // ── data channel setup (both sides) ──────────────────────────────────────

  const setupDataChannel = useCallback(
    (dc) => {
      // FIX: set binaryType BEFORE any messages arrive
      dc.binaryType = 'arraybuffer';

      dc.onopen = () => {
        setConnectionState('connected');
        if (resolveConnectionRef.current) {
          resolveConnectionRef.current();
          resolveConnectionRef.current = null;
        }
      };

      dc.onclose = () => {
        setConnectionState('disconnected');
        cleanup();
      };

      dc.onerror = (e) => console.error('DataChannel error:', e);

      dataChannelRef.current = dc;
      setDataChannel(dc);
    },
    [cleanup]
  );

  // ── peer connection factory ───────────────────────────────────────────────

  const createPeerConnection = useCallback(
    async (token) => {
      // Close any existing PC first
      if (pcRef.current) {
        try { pcRef.current.close(); } catch { /* ignore */ }
        pcRef.current = null;
      }

      const stunUrl =
        import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302';
      const turnCreds = await getTurnCredentials(token);

      const iceServers = [
        { urls: stunUrl },
        // Free public TURN fallback (rate-limited, but works when self-hosted is down)
        { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:80?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
      ];
      if (turnCreds) {
        iceServers.push({
          urls: turnCreds.urls,
          username: turnCreds.username,
          credential: turnCreds.credential,
        });
      }

      const pc = new RTCPeerConnection({ iceServers });

      pc.onicecandidate = (e) => {
        if (e.candidate && roomIdRef.current && socket) {
          socket.emit('ice-candidate', {
            candidate: e.candidate,
            roomId: roomIdRef.current,
          });
        }
      };
      pc.onicecandidateerror = (e) => {
        console.error('ICE candidate error:', e.errorCode, e.errorText, e.url);
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        if (pc.connectionState === 'failed') {
          const err = new Error('WebRTC connection failed — peer may be unreachable');
          if (rejectConnectionRef.current) {
            rejectConnectionRef.current(err);
            rejectConnectionRef.current = null;
          }
          resolveConnectionRef.current = null;
          cleanup();
        }
        if (pc.connectionState === 'disconnected') {
          cleanup();
        }
      };

      // ondatachannel fires on the RECEIVER — the sender created the DC
      pc.ondatachannel = (e) => {
        const dc = e.channel;
        setupDataChannel(dc);
        if (dc.label === 'blackwhole-chat') {
          setupChatDataChannel(dc); // Chat messages
        } else {
          setupReceiveHandler(dc); // File chunks
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [socket, getTurnCredentials, setupDataChannel, setupReceiveHandler, cleanup]
  );

  /**
   * Sets up the connection promise (reject/resolve refs + timeout).
   * Must be called BEFORE the 'connect-peer' emit so that server errors
   * arriving before waitForConnection() is invoked are not lost.
   */
  const setupConnectionTimeout = useCallback(() => {
    const promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        rejectConnectionRef.current = null;
        reject(new Error('Connection timed out after 30 s'));
      }, 30_000);
      resolveConnectionRef.current = () => {
        clearTimeout(timeout);
        rejectConnectionRef.current = null;
        resolve();
      };
      rejectConnectionRef.current = (err) => {
        clearTimeout(timeout);
        rejectConnectionRef.current = null;
        reject(err);
      };
    });
    return promise;
  }, []);

  // ── chat ───────────────────────────────────────────────────────────────────

  const initiateChat = useCallback(async (targetBwId, token) => {
    tokenRef.current = token;

    const rid = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    roomIdRef.current = rid;
    remoteBwIdRef.current = targetBwId;
    setRoomId(rid);
    setRemoteBwId(targetBwId);

    const pc = await createPeerConnection(token);
    const dc = pc.createDataChannel('blackwhole-chat');
    setupDataChannel(dc);
    setupChatDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const connectionPromise = setupConnectionTimeout();

    socket?.emit('connect-peer', {
      targetBwId,
      sdpOffer: { type: offer.type, sdp: offer.sdp },
      roomId: rid,
    });

    return { rid, connectionPromise };
  }, [socket, createPeerConnection, setupDataChannel, setupChatDataChannel, setupConnectionTimeout]);

  // ── signaling handlers ────────────────────────────────────────────────────

  const handlePeerOffer = useCallback(
    async (data) => {
      try {
        roomIdRef.current = data.roomId;
        remoteBwIdRef.current = data.senderBwId; // ref updated immediately (no render delay)
        setRoomId(data.roomId);
        setRemoteBwId(data.senderBwId);

        // Get a fresh token for TURN credentials on receiver side
        let token = tokenRef.current;
        if (!token && user) {
          try {
            token = await user.getIdToken();
            tokenRef.current = token;
          } catch { /* use STUN only */ }
        }

        const pc = await createPeerConnection(token);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdpOffer));

        // Flush any ICE candidates that arrived before the offer was processed
        for (const c of pendingCandidatesRef.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket?.emit('peer-answer', {
          sdpAnswer: { type: answer.type, sdp: answer.sdp },
          roomId: roomIdRef.current,
        });
      } catch (e) {
        console.error('handlePeerOffer error:', e);
        cleanup();
      }
    },
    [socket, createPeerConnection, cleanup, user]
  );

  const handlePeerAnswer = useCallback(async (data) => {
    if (!pcRef.current) return;
    try {
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(data.sdpAnswer)
      );
    } catch (e) {
      console.error('handlePeerAnswer error:', e);
    }
  }, []);

  const handleIceCandidate = useCallback(async (data) => {
    if (!pcRef.current || !pcRef.current.remoteDescription) {
      // Remote description not set yet — queue the candidate
      pendingCandidatesRef.current.push(data.candidate);
      return;
    }
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  }, []);

  const handlePeerDisconnect = useCallback(() => {
    setConnectionState('disconnected');
    cleanup();
  }, [cleanup]);

  const handleSocketError = useCallback((err) => {
    console.error('Socket error:', err);
    if (rejectConnectionRef.current) {
      rejectConnectionRef.current(new Error(err.message || 'Server error'));
      rejectConnectionRef.current = null;
    }
    resolveConnectionRef.current = null;
  }, []);

  const handleTransferMeta = useCallback((data) => {
    setIncomingFile({
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      senderBwId: data.senderBwId,
    });
  }, [setIncomingFile]);

  // Subscribe to socket signaling events
  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('peer-offer', handlePeerOffer);
    socket.on('peer-answer', handlePeerAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('peer-disconnect', handlePeerDisconnect);
    socket.on('server-error', handleSocketError);
    socket.on('transfer-meta', handleTransferMeta);

    return () => {
      socket.off('peer-offer', handlePeerOffer);
      socket.off('peer-answer', handlePeerAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('peer-disconnect', handlePeerDisconnect);
      socket.off('server-error', handleSocketError);
      socket.off('transfer-meta', handleTransferMeta);
    };
  }, [
    socket,
    connected,
    handlePeerOffer,
    handlePeerAnswer,
    handleIceCandidate,
    handlePeerDisconnect,
    handleSocketError,
    handleTransferMeta,
  ]);

  // ── public API ────────────────────────────────────────────────────────────

  /** Initiates a connection to `targetBwId` and returns promise + roomId. */
  const createOffer = useCallback(
    async (targetBwId, token) => {
      tokenRef.current = token;

      const rid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      roomIdRef.current = rid;
      remoteBwIdRef.current = targetBwId;
      setRoomId(rid);
      setRemoteBwId(targetBwId);

      const pc = await createPeerConnection(token);

      const dc = pc.createDataChannel('blackwhole-transfer');
      setupDataChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Set up timeout BEFORE emitting, so server errors don't race ahead
      const connectionPromise = setupConnectionTimeout();

      socket?.emit('connect-peer', {
        targetBwId,
        sdpOffer: { type: offer.type, sdp: offer.sdp },
        roomId: rid,
      });

      return { rid, connectionPromise };
    },
    [socket, createPeerConnection, setupDataChannel, setupConnectionTimeout]
  );

  /**
   * Returns a Promise that resolves when the data channel reaches 'open' state.
   * Rejects after 30 seconds.
   */
  const waitForConnection = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (dataChannelRef.current?.readyState === 'open') {
          resolve();
          return;
        }
        const timeout = setTimeout(() => {
          rejectConnectionRef.current = null;
          reject(new Error('Connection timed out after 30 s'));
        }, 30_000);
        resolveConnectionRef.current = () => {
          clearTimeout(timeout);
          rejectConnectionRef.current = null;
          resolve();
        };
        rejectConnectionRef.current = (err) => {
          clearTimeout(timeout);
          rejectConnectionRef.current = null;
          reject(err);
        };
      }),
    []
  );

  const value = {
    createOffer,
    connectionState,
    dataChannel,
    dataChannelRef,
    remoteBwId,
    roomId,
    waitForConnection,
    cleanup,
    initiateChat,
    sendChatMessage,
    chatMessages,
    chatConnected,
  };

  return (
    <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>
  );
}

export function useWebRTCContext() {
  const ctx = useContext(WebRTCContext);
  if (!ctx)
    throw new Error('useWebRTCContext must be used within <WebRTCProvider>');
  return ctx;
}
