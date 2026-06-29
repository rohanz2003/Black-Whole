import { useState } from 'react';

export default function BwIdCard({ bwId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!bwId) return;
    try {
      await navigator.clipboard.writeText(bwId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  return (
    <div
      className="rounded-card p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))',
        border: '1px solid rgba(124,58,237,0.25)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-bw-muted text-xs font-space-grotesk font-bold tracking-widest uppercase">
            Your BlackWhole ID
          </p>
          <p className="text-bw-purple-lt font-jetbrains-mono text-3xl tracking-wide" style={{ letterSpacing: '0.15em' }}>
            {bwId || '---'}
          </p>
          <p className="text-bw-muted text-xs font-inter">
            Share this ID to receive files from anyone
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-button text-sm font-inter font-medium border border-bw-border text-bw-white hover:bg-bw-surface transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy ID'}
          </button>
        </div>
      </div>
    </div>
  );
}
