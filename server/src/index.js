require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const { auth } = require('./lib/firebase');
const { connectDB } = require('./lib/mongodb');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const turnRoutes = require('./routes/turn');
const verifyTokenMiddleware = require('./middleware/verifyToken');
const {
  handleConnectPeer,
  handlePeerAnswer,
  handleIceCandidate,
  handleTransferStart,
  handleTransferComplete
} = require('./socket/signalingHandler');
const roomManager = require('./socket/roomManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(helmet());
app.use(express.json());

connectDB();

const users = new Map();
const bwIdToSocketId = new Map();

app.use('/api/auth', authRoutes);
app.use('/api/user', verifyTokenMiddleware, userRoutes);
app.use('/api/turn-credentials', verifyTokenMiddleware, turnRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error('No token provided');

    const decodedToken = await auth.verifyIdToken(token);
    socket.user = decodedToken;

    const userDoc = await User.findOne({ uid: socket.user.uid });
    socket.user.bwId = userDoc ? userDoc.bwId : null;
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.user.uid);

  users.set(socket.id, {
    uid: socket.user.uid,
    bwId: socket.user.bwId
  });

  if (socket.user.bwId) {
    console.log(`  bwId mapping: ${socket.user.bwId} -> ${socket.id}`);
    bwIdToSocketId.set(socket.user.bwId, socket.id);
  } else {
    console.log(`  WARNING: No bwId for uid=${socket.user.uid}`);
  }

  const roomsMap = roomManager.getRooms();

  socket.on('connect-peer', handleConnectPeer(socket, io, users, bwIdToSocketId, roomsMap));
  socket.on('peer-answer', handlePeerAnswer(socket, io, roomsMap));
  socket.on('ice-candidate', handleIceCandidate(socket, io, roomsMap));
  socket.on('transfer-start', handleTransferStart(socket, io, roomsMap, users));
  socket.on('transfer-complete', handleTransferComplete(socket, io, roomsMap));
  socket.on('transfer-retry', (data) => {
    console.log(`User ${socket.user.uid} retrying transfer ${data.transferId}`);
    socket.emit('transfer-retry-ack', { transferId: data.transferId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.uid);
    const user = users.get(socket.id);
    if (user) {
      const roomsForSocket = roomManager.getRoomsForSocket(socket.id);
      for (const roomId of roomsForSocket) {
        const peers = roomsMap.get(roomId);
        if (peers) {
          const otherPeerId = peers.find(id => id !== socket.id);
          if (otherPeerId) {
            io.to(otherPeerId).emit('peer-disconnect', { reason: 'peer disconnected' });
          }
        }
        roomManager.removeRoom(roomId);
      }
      users.delete(socket.id);
      if (user.bwId) {
        let foundOther = false;
        for (const [sid, u] of users) {
          if (u.bwId === user.bwId) {
            bwIdToSocketId.set(user.bwId, sid);
            foundOther = true;
            break;
          }
        }
        if (!foundOther) {
          bwIdToSocketId.delete(user.bwId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
