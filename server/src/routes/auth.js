// auth.js - Authentication routes for verifying Firebase tokens

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

// Verify Firebase token and return user info
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture
  });
});

module.exports = router;