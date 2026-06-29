import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, signOut } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!user?.bwId) return;
    try {
      await navigator.clipboard.writeText(user.bwId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const initial = (user?.displayName || user?.email || 'U')[0].toUpperCase();

  return (
    <div className="flex-1 max-w-[700px] mx-auto px-8 py-10 space-y-8">
      <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">Profile</h1>

      <div className="rounded-card bg-bw-surface border border-bw-border p-8 space-y-6">
        <div className="flex items-center gap-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-bw-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            }}
          >
            {initial}
          </div>
          <div>
            <h2 className="text-bw-white font-space-grotesk font-bold text-2xl">{user?.displayName || 'User'}</h2>
            <p className="text-bw-muted font-inter text-sm">{user?.email}</p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-pill bg-bw-green/10 text-bw-green text-xs font-jetbrains-mono">
              ✓ Google verified
            </span>
          </div>
        </div>
      </div>

      <div
        className="rounded-card p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))',
          border: '1px solid rgba(124,58,237,0.25)',
        }}
      >
        <p className="text-bw-muted text-xs font-space-grotesk font-bold tracking-widest uppercase mb-2">
          Your BlackWhole ID
        </p>
        <div className="flex items-center gap-4">
          <span className="text-bw-purple-lt font-jetbrains-mono text-3xl tracking-wide" style={{ letterSpacing: '0.15em' }}>
            {user?.bwId || '---'}
          </span>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-button text-sm font-inter font-medium border border-bw-border text-bw-white hover:bg-bw-surface transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-bw-muted text-xs font-inter mt-2">
          Share this ID so others can send files to you
        </p>
      </div>

      <div className="rounded-card bg-bw-surface border border-bw-cyan/30 p-6 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-bw-cyan text-xl">🛡️</span>
          <h3 className="text-bw-white font-space-grotesk font-bold text-lg">End-to-End Encrypted</h3>
        </div>
        <p className="text-bw-muted font-inter text-sm leading-relaxed">
          All file transfers use DTLS 1.3 encryption via WebRTC. Your files never touch any server — they go directly from device to device. No cloud storage, no middleman, no size limits.
        </p>
      </div>

      <button
        onClick={signOut}
        className="w-full py-4 rounded-button text-base font-inter font-semibold border-2 border-bw-red/30 text-bw-red hover:bg-bw-red/5 transition-all"
      >
        Sign Out
      </button>
    </div>
  );
}
