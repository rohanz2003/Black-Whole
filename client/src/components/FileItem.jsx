import { getFileEmoji, formatFileSize, formatTimestamp } from '../lib/fileUtils';

const typeColors = {
  'video': 'rgba(167,139,250,0.15)',
  'audio': 'rgba(6,182,212,0.15)',
  'image': 'rgba(16,185,129,0.15)',
  'pdf': 'rgba(239,68,68,0.15)',
  'archive': 'rgba(245,158,11,0.15)',
  'default': 'rgba(148,163,184,0.15)',
};

function getTypeColor(mimeType) {
  if (!mimeType) return typeColors.default;
  if (mimeType.startsWith('video/')) return typeColors.video;
  if (mimeType.startsWith('audio/')) return typeColors.audio;
  if (mimeType.startsWith('image/')) return typeColors.image;
  if (mimeType.includes('pdf')) return typeColors.pdf;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return typeColors.archive;
  return typeColors.default;
}

export default function FileItem({ transfer }) {
  const { fileName, fileSize, mimeType, status, timestamp, direction, peerBwId } = transfer;
  const emoji = getFileEmoji(mimeType);
  const color = getTypeColor(mimeType);
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isPending = status === 'pending' || status === 'retrying';
  const isQueued = status === 'queued';

  return (
    <div className="flex items-center gap-4 p-4 rounded-card bg-bw-surface/50 border border-bw-border/50 hover:bg-white/[0.02] transition-all duration-200 card-hover">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: color }}
      >
        {emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-bw-white font-inter text-sm font-medium truncate">
          {fileName || 'Unknown file'}
        </p>
        <div className="flex items-center gap-3 text-xs font-jetbrains-mono text-bw-muted mt-1">
          <span>{formatFileSize(fileSize)}</span>
          {peerBwId && <span>{direction === 'sent' ? 'To' : 'From'} <span className="text-bw-purple-lt">{peerBwId}</span></span>}
          {timestamp && <span>{formatTimestamp(timestamp)}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-pill text-xs font-jetbrains-mono font-medium ${
            isCompleted ? 'bg-bw-green/10 text-bw-green border border-bw-green/20' :
            isFailed ? 'bg-bw-red/10 text-bw-red border border-bw-red/20' :
            isPending ? 'bg-bw-gold/10 text-bw-gold border border-bw-gold/20 animate-breathe' :
            'bg-bw-muted/10 text-bw-muted border border-bw-muted/20'
          }`}
        >
          {isCompleted ? '✓ Completed' : isFailed ? '✗ Failed' : isPending ? '⏳ Pending' : isQueued ? '📦 Queued' : status}
        </span>

        {direction === 'sent' && (
          <span className="text-xs text-bw-muted">📤</span>
        )}
        {direction === 'received' && (
          <span className="text-xs text-bw-muted">📥</span>
        )}
      </div>
    </div>
  );
}
