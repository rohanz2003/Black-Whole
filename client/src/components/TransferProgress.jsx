export default function TransferProgress({ progress, speed, eta, status }) {
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
    sending: 'Transferring...',
    completed: 'Complete',
    error: 'Failed',
    cancelled: 'Cancelled',
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-jetbrains-mono">
        <span className="text-bw-cyan">{statusLabels[status] || ''}</span>
        <span className="text-bw-muted">
          {speed > 0 && `${(speed / 1024 / 1024).toFixed(1)} MB/s`}
          {eta > 0 && ` • ${eta < 60 ? Math.round(eta) + 's' : Math.round(eta / 60) + 'm'} left`}
        </span>
      </div>

      <div className="w-full h-1.5 bg-bw-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${statusColors[status] || 'bg-bw-cyan'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="text-right text-xs font-jetbrains-mono text-bw-muted">
        {Math.round(progress)}%
      </div>
    </div>
  );
}
