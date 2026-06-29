import { useState } from 'react';
import { useTransfer } from '../context/TransferContext';
import FileItem from '../components/FileItem';

export default function History() {
  const { transfers } = useTransfer();
  const [filter, setFilter] = useState('all');

  const filtered = transfers.filter(t => {
    if (filter === 'sent') return t.direction === 'sent';
    if (filter === 'received') return t.direction === 'received';
    return true;
  });

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'sent', label: 'Sent' },
    { key: 'received', label: 'Received' },
  ];

  return (
    <div className="flex-1 max-w-[900px] mx-auto px-8 py-10 space-y-8">
      <div>
        <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">History</h1>
        <p className="text-bw-muted font-inter text-sm mt-1">
          All your sent and received files
        </p>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-pill text-sm font-inter font-medium transition-all ${
              filter === tab.key
                ? 'bg-bw-purple text-bw-white'
                : 'text-bw-muted border border-bw-border hover:text-bw-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card bg-bw-surface border border-bw-border p-16 text-center">
          <span className="text-4xl">📭</span>
          <p className="text-bw-muted font-inter text-sm mt-4">
            No transfers yet. Send your first file!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <FileItem key={t.transferId} transfer={t} />
          ))}
        </div>
      )}
    </div>
  );
}
