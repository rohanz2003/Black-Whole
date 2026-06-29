const express = require('express');
const router = express.Router();

let db;
try {
  const { getFirestore } = require('firebase-admin/firestore');
  db = getFirestore();
} catch (e) {
  console.warn('Firestore not available');
}

router.get('/:bwId', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database service unavailable' });
  }
  try {
    const bwId = req.params.bwId.toUpperCase();
    const snapshot = await db.collection('users').where('bwId', '==', bwId).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = snapshot.docs[0].data();
    res.json({
      bwId: userData.bwId,
      displayName: userData.displayName,
      photoURL: userData.photoURL
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
