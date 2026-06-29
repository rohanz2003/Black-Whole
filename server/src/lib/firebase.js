const { initializeApp, cert, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let auth;

function init() {
  try {
    return getApp();
  } catch (_) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    if (!serviceAccount.privateKey || serviceAccount.privateKey === 'placeholder') {
      throw new Error('FIREBASE_PRIVATE_KEY not set');
    }
    return initializeApp({ credential: cert(serviceAccount) });
  }
}

try {
  const app = init();
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase Admin init failed (set valid FIREBASE_* env vars):', e.message);
}

module.exports = { auth };
