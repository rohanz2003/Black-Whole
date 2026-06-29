const rooms = new Map();

class RoomManager {
  getRooms() {
    return rooms;
  }

  createRoom(socketId1, socketId2) {
    const roomId = `${socketId1}-${socketId2}-${Date.now()}`;
    rooms.set(roomId, [socketId1, socketId2]);
    return roomId;
  }

  getPeersInRoom(roomId) {
    return rooms.get(roomId) || [];
  }

  removeRoom(roomId) {
    rooms.delete(roomId);
  }

  getRoomsForSocket(socketId) {
    const result = [];
    for (const [roomId, peers] of rooms.entries()) {
      if (peers.includes(socketId)) {
        result.push(roomId);
      }
    }
    return result;
  }

  cleanupPeer(socketId) {
    const toRemove = [];
    for (const [roomId, peers] of rooms.entries()) {
      if (peers.includes(socketId)) {
        toRemove.push(roomId);
      }
    }
    toRemove.forEach(roomId => this.removeRoom(roomId));
  }
}

module.exports = new RoomManager();
