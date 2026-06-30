// signalingHandler.js - handles Socket.IO events for peer-to-peer signaling

// This file contains the Socket.IO event handlers for:
// - Peer connection offers/answers
// - ICE candidate exchange
// - Transfer metadata exchange
// - Peer disconnection handling

// Note: The actual Socket.IO setup and middleware is in server/src/index.js
// This file contains the logic that would be called from index.js

// Since we've implemented the logic directly in index.js for simplicity,
// this file serves as a placeholder for better organization in a larger app

module.exports = {
  // In a refactored version, these functions would be called from index.js
  handleConnectPeer: (socket, io, users, bwIdToSocketId, rooms) => {
    return async (data) => {
      try {
        const { targetBwId, sdpOffer, roomId: clientRoomId } = data;

        // Look up target user by BW-ID
        const targetSocketId = bwIdToSocketId.get(targetBwId.toUpperCase());
        if (!targetSocketId) {
          console.error(`USER_NOT_FOUND: targetBwId=${targetBwId}, mapping size=${bwIdToSocketId.size}`);
          for (const [bwId, sid] of bwIdToSocketId) {
            console.error(`  bwId=${bwId} -> socketId=${sid}`);
          }
          socket.emit('server-error', { code: 'USER_NOT_FOUND', message: 'User not found' });
          return;
        }

        const roomId = clientRoomId || `${socket.id}-${targetSocketId}-${Date.now()}`;
        rooms.set(roomId, [socket.id, targetSocketId]);

        // Join the room
        socket.join(roomId);
        io.to(targetSocketId).socketsJoin(roomId);

        // Forward the offer to the target user
        io.to(targetSocketId).emit('peer-offer', {
          sdpOffer,
          senderBwId: users.get(socket.id).bwId,
          roomId
        });
      } catch (error) {
        console.error('Error handling connect-peer:', error);
        socket.emit('server-error', { code: 'INTERNAL_ERROR', message: 'Failed to initiate connection' });
      }
    };
  },

  handlePeerAnswer: (socket, io, rooms) => {
    return (data) => {
      try {
        const { sdpAnswer, roomId } = data;
        const room = rooms.get(roomId);
        if (!room) {
          socket.emit('server-error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          return;
        }

        // Find the other peer in the room
        const otherPeerId = room.find(id => id !== socket.id);
        if (!otherPeerId) {
          socket.emit('server-error', { code: 'PEER_NOT_FOUND', message: 'Peer not found in room' });
          return;
        }

        // Forward the answer to the other peer
        io.to(otherPeerId).emit('peer-answer', { sdpAnswer });
      } catch (error) {
        console.error('Error handling peer-answer:', error);
        socket.emit('server-error', { code: 'INTERNAL_ERROR', message: 'Failed to process answer' });
      }
    };
  },

  handleIceCandidate: (socket, io, rooms) => {
    return (data) => {
      try {
        const { candidate, roomId } = data;
        const room = rooms.get(roomId);
        if (!room) {
          socket.emit('server-error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          return;
        }

        // Find the other peer in the room
        const otherPeerId = room.find(id => id !== socket.id);
        if (!otherPeerId) {
          socket.emit('server-error', { code: 'PEER_NOT_FOUND', message: 'Peer not found in room' });
          return;
        }

        // Forward the ICE candidate to the other peer
        io.to(otherPeerId).emit('ice-candidate', { candidate });
      } catch (error) {
        console.error('Error handling ice-candidate:', error);
        socket.emit('server-error', { code: 'INTERNAL_ERROR', message: 'Failed to process ICE candidate' });
      }
    };
  },

  handleTransferStart: (socket, io, rooms, users) => {
    return (data) => {
      try {
        const { roomId, fileName, fileSize, mimeType } = data;
        const room = rooms.get(roomId);
        if (!room) {
          socket.emit('server-error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          return;
        }

        // Find the other peer in the room
        const otherPeerId = room.find(id => id !== socket.id);
        if (!otherPeerId) {
          socket.emit('server-error', { code: 'PEER_NOT_FOUND', message: 'Peer not found in room' });
          return;
        }

        // Forward transfer metadata to the other peer
        io.to(otherPeerId).emit('transfer-meta', {
          fileName,
          fileSize,
          mimeType,
          senderBwId: users.get(socket.id).bwId
        });
      } catch (error) {
        console.error('Error handling transfer-start:', error);
        socket.emit('server-error', { code: 'INTERNAL_ERROR', message: 'Failed to process transfer start' });
      }
    };
  },

  handleTransferComplete: (socket, io, rooms) => {
    return (data) => {
      try {
        const { roomId, transferId } = data;
        const room = rooms.get(roomId);
        if (!room) {
          socket.emit('server-error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          return;
        }

        // Find the other peer in the room
        const otherPeerId = room.find(id => id !== socket.id);
        if (!otherPeerId) {
          socket.emit('server-error', { code: 'PEER_NOT_FOUND', message: 'Peer not found in room' });
          return;
        }

        // Forward transfer completion to the other peer
        io.to(otherPeerId).emit('transfer-complete', { roomId, transferId });
      } catch (error) {
        console.error('Error handling transfer-complete:', error);
        socket.emit('server-error', { code: 'INTERNAL_ERROR', message: 'Failed to process transfer completion' });
      }
    };
  }
};