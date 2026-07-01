export default function TransferProgress({ progress, speed, eta, status, peakSpeed }) {
  if (!progress && !speed && status === 'idle') return null;

  const statusColors = {
    idle: 'bg-bw-muted',
    sending: 'bg-bw-cyan',
    completed: 'bg-bw-green',
    error: 'bg-bw-red',
    cancelled: 'bg-bw-red',
  };

  const statusLabels = {
    idle: '',
    sending: '⬛ Pulling file in...',
    completed: '✓ Complete',
    error: '✗ Failed',
    cancelled: '✗ Cancelled',
  };

  return (
    <div className="w-full space-y-2 animate-fadeUp">
      <div className="flex items-center justify-between text-xs font-jetbrains-mono">
        <span className="text-bw-cyan font-medium">{statusLabels[status] || ''}</span>
        <span className="text-bw-muted">
          {speed > 0 && (
            <span className="text-bw-purple-lt">{(speed / 1024 / 1024).toFixed(1)} MB/s</span>
          )}
          {eta > 0 && (
            <span className="ml-2">
              · {eta < 60 ? Math.round(eta) + 's' : Math.round(eta / 60) + 'm'} left
            </span>
          )}
        </span>
      </div>

      <div className="w-full h-2 bg-bw-border/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${statusColors[status] || 'bg-bw-cyan'}`}
          style={{
            width: `${Math.min(progress, 100)}%`,
            boxShadow: progress > 0 && progress < 100
              ? '0 0 10px rgba(6,182,212,0.4)'
              : 'none',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs font-jetbrains-mono">
        <span className="text-bw-muted">{Math.round(progress)}%</span>
        <span className="text-bw-muted">
          {peakSpeed > 0 && (
            <span className="text-bw-gold">peak {(peakSpeed / 1024 / 1024).toFixed(1)} MB/s</span>
          )}
          {' '}
          {progress > 0 && progress < 100 && (
            <span>
              {'▓'.repeat(Math.floor(progress / 10))}{'░'.repeat(10 - Math.floor(progress / 10))}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
