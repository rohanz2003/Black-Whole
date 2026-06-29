const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/:bwId', async (req, res) => {
  try {
    const bwId = req.params.bwId.toUpperCase();
    const user = await User.findOne({ bwId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      bwId: user.bwId,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
