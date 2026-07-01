import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const navigate = useNavigate();
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    try {
      setBusy(true);
      await signInWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e?.message || 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        await signUpWithEmail(email, password);
        setMessage('Account created successfully.');
      } else {
        await signInWithEmail(email, password);
      }
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e?.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      setError('Enter your email to reset the password.');
      return;
    }
    try {
      setBusy(true);
      await resetPassword(email);
      setMessage('Password reset email sent.');
    } catch (e) {
      setError(e?.message || 'Unable to send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-[var(--bw-border)] bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(6,182,212,0.12))] p-8 shadow-[0_18px_50px_rgba(124,58,237,0.12)]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--bw-purple)] to-[var(--bw-cyan)] text-2xl font-black text-white shadow-[0_0_25px_rgba(124,58,237,0.4)]">
              B
            </div>
            <div>
              <div className="font-space-grotesk text-3xl font-bold text-[var(--bw-text)]">BlackWhole</div>
              <div className="text-xs uppercase tracking-[0.4em] text-[var(--bw-muted)]">Secure sharing</div>
            </div>
          </div>

          <h1 className="font-space-grotesk text-4xl font-bold leading-tight text-[var(--bw-text)]">
            Make sharing feel instant.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--bw-muted)]">
            Send 10 GB files, chat securely, and manage transfers from one polished workspace.
          </p>
        </div>

        <div className="rounded-[32px] border border-[var(--bw-border)] bg-[var(--bw-surface)] p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-6 grid grid-cols-2 rounded-full bg-[var(--bw-void)] p-1">
            <button
              onClick={() => setMode('login')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-[var(--bw-purple)] text-white' : 'text-[var(--bw-muted)]'}`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'register' ? 'bg-[var(--bw-purple)] text-white' : 'text-[var(--bw-muted)]'}`}
            >
              Register
            </button>
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--bw-border)] px-4 py-3 text-sm font-semibold text-[var(--bw-text)] transition hover:bg-[var(--bw-void)]"
          >
            <span className="text-lg">🔍</span>
            Continue with Google
          </button>

          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--bw-muted)]">
            <span className="h-px flex-1 bg-[var(--bw-border)]" />
            or with email
            <span className="h-px flex-1 bg-[var(--bw-border)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-[var(--bw-border)] bg-transparent px-4 py-3 outline-none focus:border-[var(--bw-purple)]"
              placeholder="Email address"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-[var(--bw-border)] bg-transparent px-4 py-3 outline-none focus:border-[var(--bw-purple)]"
              placeholder="Password"
            />
            {mode === 'register' && (
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-2xl border border-[var(--bw-border)] bg-transparent px-4 py-3 outline-none focus:border-[var(--bw-purple)]"
                placeholder="Confirm password"
              />
            )}

            <button
              disabled={busy}
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-[var(--bw-purple)] to-[var(--bw-cyan)] px-4 py-3 font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition hover:scale-[1.01]"
            >
              {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <button onClick={handleForgot} className="text-sm text-[var(--bw-purple)]">
              Forgot password?
            </button>
          </div>

          {error && <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}
          {message && <p className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">{message}</p>}
        </div>
      </div>
    </div>
  );
}
