const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
let connected = false;

async function connectDB() {
  if (connected) return;
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not set — server will run without database');
    return;
  }
  if (!MONGODB_URI.startsWith('mongodb')) {
    console.error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    connected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    if (err.message.includes('querySrv')) {
      console.error('');
      console.error('  DNS SRV lookup failed. This usually means:');
      console.error('  1. The cluster hostname is wrong — check your connection string');
      console.error('  2. Your network blocks DNS SRV queries');
      console.error('');
      console.error('  Fix: Get the correct connection string from MongoDB Atlas:');
      console.error('    1. Go to https://cloud.mongodb.com');
      console.error('    2. Click "Connect" on your cluster');
      console.error('    3. Click "Drivers"');
      console.error('    4. Copy the connection string (starts with mongodb+srv://)');
      console.error('    5. Replace <username> and <password> with your DB user credentials');
      console.error('    6. Add /blackwhole after the hostname before the ?');
      console.error('');
      console.error('  Example: mongodb+srv://myuser:mypass@cluster0.abcde.mongodb.net/blackwhole?retryWrites=true&w=majority');
    }
  }
}

module.exports = { connectDB, mongoose };
