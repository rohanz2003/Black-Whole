import { useRef, useState, useCallback, useEffect } from 'react';

const ICE_SERVERS = [
  { urls: import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302' },
];

export function useWebRTC(socket, connected) {
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const roomIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const resolveConnectionRef = useRef(null);

  const [connectionState, setConnectionState] = useState('new');
  const [remoteBwId, setRemoteBwId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);

  useEffect(() => {
    if (!socket || !connected) return;

    const handlePeerOffer = async (data) => {
      roomIdRef.current = data.roomId;
      setRoomId(data.roomId);
      setRemoteBwId(data.senderBwId);
      try {
        await handleOffer(data);
      } catch (e) {
        console.error('handlePeerOffer error:', e);
        cleanup();
      }
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
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const turnCreds = await getTurnCredentials(token);
    const config = {
      iceServers: turnCreds
        ? [...ICE_SERVERS, { urls: turnCreds.urls, username: turnCreds.username, credential: turnCreds.credential }]
        : ICE_SERVERS,
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (e) => {
      if (e.candidate && roomIdRef.current) {
        socket?.emit('ice-candidate', { candidate: e.candidate, roomId: roomIdRef.current });
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
  }, [socket]);

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
    roomIdRef.current = null;
    setDataChannel(null);
    setConnectionState('new');
    setRemoteBwId(null);
    setRoomId(null);
  }, []);

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
    setDataChannel(dc);
  }, [cleanup]);

  const createOffer = useCallback(async (targetBwId, token) => {
    const pc = await createPeerConnection(token);
    const dc = pc.createDataChannel('blackwhole-transfer');
    setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const rid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    roomIdRef.current = rid;
    setRoomId(rid);
    setRemoteBwId(targetBwId);

    socket?.emit('connect-peer', { targetBwId, sdpOffer: { type: offer.type, sdp: offer.sdp }, roomId: rid });

    return rid;
  }, [socket, createPeerConnection, setupDataChannel]);

  const handleOffer = useCallback(async (data) => {
    try {
      const pc = await createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdpOffer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('peer-answer', { sdpAnswer: { type: answer.type, sdp: answer.sdp }, roomId: roomIdRef.current });

      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
      }
      pendingCandidatesRef.current = [];
    } catch (e) {
      console.error('handleOffer error:', e);
      cleanup();
    }
  }, [socket, createPeerConnection, cleanup]);

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
      const timeout = setTimeout(() => {
        if (dataChannelRef.current?.readyState !== 'open') {
          reject(new Error('Connection timed out'));
        }
      }, 15000);
      resolveConnectionRef.current = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  }, []);

  return {
    createOffer,
    connectionState,
    dataChannel,
    remoteBwId,
    roomId,
    waitForConnection,
    cleanup,
  };
}
