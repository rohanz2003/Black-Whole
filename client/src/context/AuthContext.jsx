import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:4000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken();
          let userData = {};

          try {
            const res = await fetch(`${API}/api/auth/me`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) userData = await res.json();
          } catch {}

          setUser({
            uid: firebaseUser.uid,
            bwId: userData.bwId || await generateBwIdLocally(firebaseUser.uid),
            displayName: userData.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: userData.email || firebaseUser.email || '',
            photoURL: userData.photoURL || firebaseUser.photoURL || '',
            token,
            getIdToken: () => firebaseUser.getIdToken(),
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return;
      if (err.code === 'auth/popup-blocked') {
        try { await signInWithRedirect(auth, googleProvider); } catch {}
        return;
      }
      console.error('Google sign-in error:', err);
    }
  };

  const signOut = async () => {
    try { await firebaseSignOut(auth); } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function generateBwIdLocally(uid) {
  if (!uid) return 'BW-000000';
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash |= 0;
  }
  return 'BW-' + Math.abs(hash).toString(16).padStart(6, '0').toUpperCase().substring(0, 6);
}
