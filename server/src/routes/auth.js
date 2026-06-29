const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');

function generateBwId(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(6, '0').toUpperCase();
  return 'BW-' + hex.substring(0, 6);
}

router.post('/me', verifyToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    let user = await User.findOne({ uid });

    if (!user) {
      const bwId = generateBwId(uid);
      user = await User.create({
        uid,
        bwId,
        displayName: name || email?.split('@')[0] || 'User',
        email: email || '',
        photoURL: picture || '',
      });
    }

    res.json({
      uid: user.uid,
      bwId: user.bwId,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      transferCount: user.transferCount,
    });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/verify', verifyToken, (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture
  });
});

module.exports = router;
