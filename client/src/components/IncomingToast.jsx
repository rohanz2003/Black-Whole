import { useEffect, useState } from 'react';
import { formatFileSize } from '../lib/fileUtils';

export default function IncomingToast({ incomingFile, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (incomingFile) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [incomingFile, onDismiss]);

  if (!visible || !incomingFile) return null;

  const fileEmoji = incomingFile.mimeType?.startsWith('video/') ? '🎬' :
    incomingFile.mimeType?.startsWith('audio/') ? '🎵' :
    incomingFile.mimeType?.startsWith('image/') ? '🖼️' : '📄';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-incoming">
      <div
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(17, 24, 39, 0.85)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: 16,
          boxShadow: '0 0 30px rgba(124, 58, 237, 0.2)',
        }}
        className="p-4 w-80"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-bw-purple/20 flex items-center justify-center text-lg">
            ⬛
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-bw-purple-lt text-xs font-space-grotesk font-bold uppercase tracking-wider">
              INCOMING FILE
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg">{fileEmoji}</span>
              <span className="text-bw-white text-sm font-inter truncate">{incomingFile.fileName}</span>
            </div>
            <p className="text-bw-muted text-xs font-jetbrains-mono mt-0.5">
              {formatFileSize(incomingFile.fileSize)}
              {incomingFile.senderBwId && ` from ${incomingFile.senderBwId}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            className="flex-1 px-3 py-1.5 rounded-button bg-bw-purple text-bw-white text-xs font-inter font-medium"
          >
            ✓ Auto-saving…
          </button>
          <button
            onClick={() => { setVisible(false); onDismiss?.(); }}
            className="px-3 py-1.5 rounded-button text-bw-muted text-xs font-inter border border-bw-border hover:bg-bw-surface transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
