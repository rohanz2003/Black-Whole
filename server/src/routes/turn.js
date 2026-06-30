// turn.js - TURN server credentials route

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const crypto = require('crypto');

// Generate time-limited HMAC-SHA1 TURN credentials
router.get('/', verifyToken, (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const username = `${timestamp}:blackwhole`;
    const key = Buffer.from(process.env.TURN_SECRET || 'secret123', 'utf-8');
    const msg = Buffer.from(username, 'utf-8');
    const credential = crypto.createHmac('sha1', key).update(msg).digest('base64');

    res.json({
      urls: [
        `turn:${process.env.TURN_SERVER_URL || 'localhost:3478'}?transport=udp`,
        `turn:${process.env.TURN_SERVER_URL || 'localhost:3478'}?transport=tcp`,
      ],
      username,
      credential,
      ttl: 86400
    });
  } catch (error) {
    console.error('Error generating TURN credentials:', error);
    res.status(500).json({ error: 'Failed to generate TURN credentials' });
  }
});

module.exports = router;