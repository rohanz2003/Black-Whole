import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTransfer } from '../context/TransferContext';
import { formatFileSize } from '../lib/fileUtils';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { transfers } = useTransfer();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!user?.bwId) return;
    try {
      await navigator.clipboard.writeText(user.bwId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const initial = (user?.displayName || user?.email || 'U')[0].toUpperCase();

  const totalSent = transfers.filter(t => t.direction === 'sent' && t.status === 'completed').length;
  const totalReceived = transfers.filter(t => t.direction === 'received' && t.status === 'completed').length;
  const totalBytes = transfers.reduce((acc, t) => acc + (t.fileSize || 0), 0);

  return (
    <div className={`flex-1 max-w-[720px] mx-auto px-8 py-10 page-enter`}>
      <div className="stagger-1">
        <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">Profile</h1>
      </div>

      {/* User card */}
      <div className="mt-8 stagger-2">
        <div
          className="rounded-card p-8 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.05))',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          <div className="flex items-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-bw-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                boxShadow: '0 0 30px rgba(124,58,237,0.3)',
              }}
            >
              {initial}
            </div>
            <div>
              <h2 className="text-bw-white font-space-grotesk font-bold text-2xl">
                {user?.displayName || 'User'}
              </h2>
              <p className="text-bw-muted font-inter text-sm">{user?.email}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-2 rounded-pill bg-bw-green/10 text-bw-green text-xs font-jetbrains-mono border border-bw-green/20">
                <span className="w-1.5 h-1.5 rounded-full bg-bw-green" />
                Google verified
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-6 stagger-3">
        {[
          { label: 'Sent', value: totalSent, icon: '📤', color: 'text-bw-cyan' },
          { label: 'Received', value: totalReceived, icon: '📥', color: 'text-bw-green' },
          { label: 'Total', value: formatFileSize(totalBytes), icon: '⚡', color: 'text-bw-purple-lt' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-card bg-bw-surface/50 border border-bw-border/50 p-5 text-center card-hover"
          >
            <span className="text-2xl">{stat.icon}</span>
            <p className={`text-2xl font-bold font-jetbrains-mono mt-2 ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-bw-muted text-xs font-inter mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* BW-ID */}
      <div className="mt-6 stagger-4">
        <div
          className="rounded-card p-6 relative overflow-hidden card-hover"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          <p className="text-bw-muted text-xs font-space-grotesk font-bold tracking-widest uppercase mb-3">
            Your BlackWhole ID
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <span
              className="text-bw-purple-lt font-jetbrains-mono text-3xl tracking-wide"
              style={{ letterSpacing: '0.15em' }}
            >
              {user?.bwId || '---'}
            </span>
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 rounded-button text-sm font-inter font-medium border border-bw-border/50 text-bw-white hover:bg-white/5 transition-all hover:scale-105 active:scale-95"
            >
              {copied ? (
                <span className="text-bw-green flex items-center gap-1">
                  <span className="animate-scaleIn inline-block">✓</span> Copied!
                </span>
              ) : 'Copy'}
            </button>
          </div>
          <p className="text-bw-muted text-xs font-inter mt-3">
            Share this ID so others can send files directly to you
          </p>
        </div>
      </div>

      {/* Security card */}
      <div className="mt-6 stagger-5">
        <div className="rounded-card bg-bw-surface/50 border border-bw-cyan/20 p-6 card-hover">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: 'rgba(6,182,212,0.1)' }}
            >
              🛡️
            </div>
            <div>
              <h3 className="text-bw-white font-space-grotesk font-bold text-lg">End-to-End Encrypted</h3>
              <p className="text-bw-muted font-inter text-sm leading-relaxed mt-1">
                All transfers use DTLS 1.3 encryption via WebRTC. Your files never touch any server —
                they go directly from device to device. No cloud storage, no middleman, no size limits.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="mt-10 stagger-6">
        <button
          onClick={signOut}
          className="w-full py-4 rounded-button text-base font-inter font-semibold border-2 border-bw-red/20 text-bw-red hover:bg-bw-red/5 transition-all hover:scale-[1.01] active:scale-98"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
