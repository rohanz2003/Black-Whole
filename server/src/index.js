require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { initializeApp, cert, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const cors = require('cors');
const helmet = require('helmet');

// Import route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const turnRoutes = require('./routes/turn');
// Import middleware
const verifyTokenMiddleware = require('./middleware/verifyToken');
// Import Socket.IO handlers
const {
  handleConnectPeer,
  handlePeerAnswer,
  handleIceCandidate,
  handleTransferStart,
  handleTransferComplete
} = require('./socket/signalingHandler');
// Import roomManager
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

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Initialize Firebase Admin (wrapped so server starts without valid creds)
let auth, db;
try {
  const app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('Firebase Admin already initialized, reusing existing app');
} catch (e) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    const app = initializeApp({ credential: cert(serviceAccount) });
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase Admin initialized');
  } catch (initError) {
    console.warn('Firebase Admin init failed (set valid FIREBASE_* env vars):', initError.message);
  }
}

// In-memory storage for connected users and rooms
const users = new Map(); // socketId => { uid, bwId }
const bwIdToSocketId = new Map(); // bwId => socketId

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', verifyTokenMiddleware, userRoutes);
app.use('/api/turn-credentials', verifyTokenMiddleware, turnRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.use(async (socket, next) => {
  if (!auth || !db) {
    return next(new Error('Firebase not configured'));
  }
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new Error('No token provided');
    }

    const decodedToken = await auth.verifyIdToken(token);
    socket.user = decodedToken;
    const userDoc = await db.collection('users').doc(socket.user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      socket.user.bwId = userData.bwId;
    } else {
      socket.user.bwId = null;
    }
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.user.uid);

  // Store user info
  users.set(socket.id, {
    uid: socket.user.uid,
    bwId: socket.user.bwId
  });

  // If we have a BW-ID, map it to socket ID for quick lookup
  if (socket.user.bwId) {
    bwIdToSocketId.set(socket.user.bwId, socket.id);
  }

  const roomsMap = roomManager.getRooms();

  socket.on('connect-peer', handleConnectPeer(socket, io, users, bwIdToSocketId, roomsMap));

  socket.on('peer-answer', handlePeerAnswer(socket, io, roomsMap));

  socket.on('ice-candidate', handleIceCandidate(socket, io, roomsMap));

  socket.on('transfer-start', handleTransferStart(socket, io, roomsMap, users));

  socket.on('transfer-complete', handleTransferComplete(socket, io, roomsMap));

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
        bwIdToSocketId.delete(user.bwId);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});