import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransfer } from '../context/TransferContext';
import FileItem from '../components/FileItem';

const tabs = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'sent', label: 'Sent', icon: '📤' },
  { key: 'received', label: 'Received', icon: '📥' },
  { key: 'pending', label: 'Pending', icon: '⏳' },
];

export default function History() {
  const { transfers, pendingTransfers, removePending } = useTransfer();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filtered = transfers.filter(t => {
    if (filter === 'sent') return t.direction === 'sent';
    if (filter === 'received') return t.direction === 'received';
    if (filter === 'pending') return t.status === 'pending' || t.status === 'retrying';
    return true;
  });

  const handleRetry = (t) => {
    navigate('/send', { state: { retryTransfer: t } });
  };

  const handleDismiss = (t) => {
    removePending(t.transferId);
  };

  return (
    <div className={`flex-1 max-w-[920px] mx-auto px-8 py-10 page-enter`}>
      <div className="stagger-1">
        <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">History</h1>
        <p className="text-bw-muted font-inter text-sm mt-1">
          All your sent and received files
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mt-8 stagger-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-pill text-sm font-inter font-medium transition-all duration-300 ${
              filter === tab.key
                ? 'text-bw-white'
                : 'text-bw-muted border border-bw-border/50 hover:text-bw-white hover:border-bw-border'
            }`}
            style={
              filter === tab.key
                ? {
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))',
                    border: '1px solid rgba(124,58,237,0.3)',
                    boxShadow: '0 0 15px rgba(124,58,237,0.1)',
                  }
                : {}
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.key === 'pending' && pendingTransfers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-bw-gold/20 text-bw-gold text-[10px] font-jetbrains-mono font-bold ml-1">
                {pendingTransfers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transfer list */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-card bg-bw-surface/50 border border-bw-border/50 p-16 text-center animate-fadeIn">
            <div className="text-5xl mb-4 inline-block animate-float">
              {filter === 'pending' ? '📭' : '⬛'}
            </div>
            <p className="text-bw-muted font-inter text-sm mt-4">
              {filter === 'pending' ? 'No pending transfers' : 'No transfers yet. Send your first file!'}
            </p>
            {filter !== 'pending' && (
              <button
                onClick={() => navigate('/send')}
                className="mt-5 px-8 py-3 rounded-button text-sm font-inter font-semibold text-bw-white transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  boxShadow: '0 0 20px rgba(124,58,237,0.3)',
                }}
              >
                ⬛ Send a File
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t, i) => (
              <div key={t.transferId} style={{ animation: `slideUp 0.4s ease-out ${i * 0.04}s both` }}>
                <div className="flex items-center gap-2 group">
                  <div className="flex-1">
                    <FileItem transfer={t} />
                  </div>
                  {(t.status === 'pending' || t.status === 'retrying') && (
                    <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleRetry(t)}
                        className="px-4 py-2 rounded-button text-xs font-inter font-medium text-bw-cyan border border-bw-cyan/30 hover:bg-bw-cyan/10 transition-all hover:scale-105 active:scale-95"
                      >
                        ↻ Retry
                      </button>
                      <button
                        onClick={() => handleDismiss(t)}
                        className="px-4 py-2 rounded-button text-xs font-inter text-bw-muted border border-bw-border/50 hover:text-bw-white hover:border-bw-border transition-all hover:scale-105 active:scale-95"
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
