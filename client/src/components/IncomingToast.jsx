import { useEffect, useState } from 'react';
import { formatFileSize, getFileEmoji } from '../lib/fileUtils';

export default function IncomingToast({ incomingFile, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (incomingFile) {
      setVisible(true);
      setProgress(0);
      // Simulate progress while receiving
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 15, 95));
      }, 800);
      const timer = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setVisible(false);
          onDismiss?.();
        }, 500);
      }, 8000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      setVisible(false);
    }
  }, [incomingFile, onDismiss]);

  if (!visible || !incomingFile) return null;

  const emoji = getFileEmoji(incomingFile.mimeType);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-incoming">
      <div
        className="p-4 w-80"
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: 'rgba(17, 24, 39, 0.85)',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          borderRadius: 16,
          boxShadow: '0 0 40px rgba(124, 58, 237, 0.15)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: 'rgba(124,58,237,0.15)' }}
          >
            ⬛
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-bw-purple-lt text-xs font-space-grotesk font-bold uppercase tracking-wider">
              INCOMING FILE
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-lg">{emoji}</span>
              <span className="text-bw-white text-sm font-inter truncate font-medium">
                {incomingFile.fileName}
              </span>
            </div>
            <p className="text-bw-muted text-xs font-jetbrains-mono mt-0.5">
              {formatFileSize(incomingFile.fileSize)}
              {incomingFile.senderBwId && ` from ${incomingFile.senderBwId}`}
            </p>
            {/* Progress bar */}
            <div className="w-full h-1 bg-bw-border/50 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #7C3AED, #06B6D4)',
                  boxShadow: '0 0 8px rgba(124,58,237,0.3)',
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div
            className="flex-1 px-3 py-1.5 rounded-button text-xs font-inter font-medium text-bw-white text-center"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.1))' }}
          >
            {progress < 100 ? '⬛ Receiving...' : '✓ Auto-saving…'}
          </div>
          <button
            onClick={() => { setVisible(false); onDismiss?.(); }}
            className="px-3 py-1.5 rounded-button text-bw-muted text-xs font-inter border border-bw-border/50 hover:bg-white/5 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
