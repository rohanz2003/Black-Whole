import { useRef, useState, useCallback, useEffect } from 'react';

const ICE_SERVERS = [
  { urls: import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302' },
];

export function useWebRTC(socket, connected) {
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const [connectionState, setConnectionState] = useState('new');
  const [remoteBwId, setRemoteBwId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const resolveConnectionRef = useRef(null);

  useEffect(() => {
    if (!socket || !connected) return;

    const handlePeerOffer = async (data) => {
      setRemoteBwId(data.senderBwId);
      setRoomId(data.roomId);
      await handleOffer(data);
    };

    const handlePeerAnswer = async (data) => {
      await handleAnswer(data);
    };

    const handleIceCandidate = async (data) => {
      await handleCandidate(data);
    };

    const handlePeerDisconnect = () => {
      setConnectionState('disconnected');
      cleanup();
    };

    socket.on('peer-offer', handlePeerOffer);
    socket.on('peer-answer', handlePeerAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('peer-disconnect', handlePeerDisconnect);

    return () => {
      socket.off('peer-offer', handlePeerOffer);
      socket.off('peer-answer', handlePeerAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('peer-disconnect', handlePeerDisconnect);
    };
  }, [socket, connected]);

  const getTurnCredentials = useCallback(async (token) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:4000'}/api/turn-credentials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch TURN credentials, using STUN only');
    }
    return null;
  }, []);

  const createPeerConnection = useCallback(async (token) => {
    if (pcRef.current) return pcRef.current;

    const turnCreds = await getTurnCredentials(token);
    const config = {
      iceServers: turnCreds
        ? [...ICE_SERVERS, { urls: turnCreds.urls, username: turnCreds.username, credential: turnCreds.credential }]
        : ICE_SERVERS,
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (e) => {
      if (e.candidate && roomId) {
        socket?.emit('ice-candidate', { candidate: e.candidate, roomId });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'connected' && resolveConnectionRef.current) {
        resolveConnectionRef.current();
        resolveConnectionRef.current = null;
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
      }
    };

    pc.ondatachannel = (e) => {
      const dc = e.channel;
      setupDataChannel(dc);
    };

    pcRef.current = pc;
    return pc;
  }, [socket, roomId]);

  const setupDataChannel = useCallback((dc) => {
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
  }, []);

  const createOffer = useCallback(async (targetBwId, token) => {
    const pc = await createPeerConnection(token);
    const dc = pc.createDataChannel('blackwhole-transfer', {
      ordered: false,
      maxRetransmits: 3,
    });
    setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const rid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setRoomId(rid);
    setRemoteBwId(targetBwId);

    socket?.emit('connect-peer', { targetBwId, sdpOffer: { type: offer.type, sdp: offer.sdp }, roomId: rid });

    return rid;
  }, [socket, createPeerConnection, setupDataChannel]);

  const handleOffer = useCallback(async (data) => {
    const pc = await createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdpOffer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket?.emit('peer-answer', { sdpAnswer: { type: answer.type, sdp: answer.sdp }, roomId: data.roomId });

    for (const c of pendingCandidatesRef.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
    }
    pendingCandidatesRef.current = [];
  }, [socket, createPeerConnection]);

  const handleAnswer = useCallback(async (data) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdpAnswer));
  }, []);

  const handleCandidate = useCallback(async (data) => {
    if (!pcRef.current || !pcRef.current.remoteDescription) {
      pendingCandidatesRef.current.push(data.candidate);
      return;
    }
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  }, []);

  const waitForConnection = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (dataChannelRef.current?.readyState === 'open') {
        resolve();
        return;
      }
      resolveConnectionRef.current = resolve;
      setTimeout(() => {
        if (dataChannelRef.current?.readyState !== 'open') {
          reject(new Error('Connection timed out'));
        }
      }, 15000);
    });
  }, []);

  const cleanup = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    resolveConnectionRef.current = null;
    setConnectionState('new');
    setRemoteBwId(null);
    setRoomId(null);
  }, []);

  return {
    createOffer,
    connectionState,
    dataChannel: dataChannelRef.current,
    remoteBwId,
    roomId,
    waitForConnection,
    cleanup,
  };
}
