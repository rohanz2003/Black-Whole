import { getFileEmoji, formatFileSize, formatTimestamp, getFileTypeColor } from '../lib/fileUtils';

export default function FileItem({ transfer }) {
  const { fileName, fileSize, mimeType, status, timestamp, direction, peerBwId } = transfer;
  const emoji = getFileEmoji(mimeType);
  const colorClass = getFileTypeColor(mimeType);
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div className="flex items-center gap-4 p-4 rounded-card bg-bw-surface border border-bw-border hover:bg-white/5 transition-colors">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorClass}/20 shrink-0`}>
        {emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-bw-white font-inter text-sm truncate">{fileName || 'Unknown file'}</p>
        <div className="flex items-center gap-3 text-xs font-jetbrains-mono text-bw-muted mt-1">
          <span>{formatFileSize(fileSize)}</span>
          {peerBwId && <span>{direction === 'sent' ? 'To' : 'From'} {peerBwId}</span>}
          {timestamp && <span>{formatTimestamp(timestamp)}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`px-2.5 py-1 rounded-pill text-xs font-jetbrains-mono font-medium ${
            isCompleted ? 'bg-bw-green/10 text-bw-green' :
            isFailed ? 'bg-bw-red/10 text-bw-red' :
            'bg-bw-muted/10 text-bw-muted'
          }`}
        >
          {isCompleted ? '✓ Completed' : isFailed ? '✗ Failed' : status}
        </span>
      </div>
    </div>
  );
}
