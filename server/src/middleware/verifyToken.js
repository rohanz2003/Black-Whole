const { initializeApp, cert, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let auth;
try {
  const app = getApp();
  auth = getAuth(app);
} catch (e) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    if (serviceAccount.privateKey && serviceAccount.privateKey !== 'placeholder') {
      const adminApp = initializeApp({ credential: cert(serviceAccount) });
      auth = getAuth(adminApp);
    }
  } catch (initError) {
    console.warn('Firebase Admin initialization skipped (set valid FIREBASE_* env vars)');
  }
}

module.exports = async (req, res, next) => {
  if (!auth) {
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
