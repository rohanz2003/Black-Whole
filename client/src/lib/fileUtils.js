export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return `${val} ${units[i]}`;
}

export function getFileEmoji(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '📦';
  if (mimeType.includes('text') || mimeType.includes('document')) return '📄';
  return '📄';
}

export function formatTimestamp(date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function getFileTypeColor(mimeType) {
  if (!mimeType) return 'bg-bw-muted';
  if (mimeType.startsWith('video/')) return 'bg-bw-purple';
  if (mimeType.startsWith('audio/')) return 'bg-bw-cyan';
  if (mimeType.startsWith('image/')) return 'bg-bw-green';
  if (mimeType.includes('pdf')) return 'bg-bw-red';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'bg-bw-gold';
  return 'bg-bw-muted';
}
