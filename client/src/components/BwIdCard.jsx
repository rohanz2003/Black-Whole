import { useState } from 'react';

export default function BwIdCard({ bwId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!bwId) return;
    try {
      await navigator.clipboard.writeText(bwId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  return (
    <div
      className="rounded-card p-6 relative overflow-hidden transition-all duration-300 card-hover"
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))',
        border: '1px solid rgba(124,58,237,0.25)',
      }}
    >
      {/* Decorative gradient orbs */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #7C3AED, transparent)',
        }}
      />
      <div
        className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-8 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #06B6D4, transparent)',
        }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-bw-muted text-xs font-space-grotesk font-bold tracking-widest uppercase">
            Your BlackWhole ID
          </p>
          <p
            className="text-bw-purple-lt font-jetbrains-mono text-3xl tracking-wide"
            style={{ letterSpacing: '0.15em' }}
          >
            {bwId || '---'}
          </p>
          <p className="text-bw-muted text-xs font-inter">
            Share this ID to receive files from anyone
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="px-5 py-2.5 rounded-button text-sm font-inter font-medium border border-bw-border/50 text-bw-white hover:bg-white/5 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          {copied ? (
            <span className="text-bw-green flex items-center gap-1">
              <span className="animate-scaleIn inline-block">✓</span> Copied!
            </span>
          ) : 'Copy ID'}
        </button>
      </div>
    </div>
  );
}
