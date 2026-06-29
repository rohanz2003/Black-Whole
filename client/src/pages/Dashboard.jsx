import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTransfer } from '../context/TransferContext';
import BwIdCard from '../components/BwIdCard';
import FileItem from '../components/FileItem';
import { formatFileSize } from '../lib/fileUtils';

export default function Dashboard() {
  const { user } = useAuth();
  const { transfers } = useTransfer();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const sentCount = transfers.filter(t => t.direction === 'sent').length;
  const receivedCount = transfers.filter(t => t.direction === 'received').length;
  const totalSize = transfers.reduce((acc, t) => acc + (t.fileSize || 0), 0);
  const recentTransfers = transfers.slice(0, 4);

  return (
    <div className="flex-1 max-w-[900px] mx-auto px-8 py-10 space-y-10">
      <div>
        <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">
          {greeting}, {user?.displayName?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-bw-muted font-inter text-sm mt-1">
          Ready to send something into the void?
        </p>
      </div>

      <BwIdCard bwId={user?.bwId} />

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: '📤', label: 'Files Sent', value: sentCount, color: 'text-bw-cyan' },
          { icon: '📥', label: 'Files Received', value: receivedCount, color: 'text-bw-green' },
          { icon: '⚡', label: 'Data Transferred', value: formatFileSize(totalSize), color: 'text-bw-purple-lt' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-card bg-bw-surface border border-bw-border p-5">
            <span className="text-2xl">{stat.icon}</span>
            <p className={`text-3xl font-bold font-jetbrains-mono mt-2 ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-bw-muted text-sm font-inter mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-bw-white font-space-grotesk font-bold text-lg">Recent Transfers</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-bw-purple-lt text-sm font-inter hover:underline"
          >
            View all →
          </button>
        </div>

        {recentTransfers.length === 0 ? (
          <div className="rounded-card bg-bw-surface border border-bw-border p-10 text-center">
            <p className="text-bw-muted font-inter text-sm">No transfers yet. Send your first file!</p>
            <button
              onClick={() => navigate('/send')}
              className="mt-4 px-6 py-2.5 rounded-button text-sm font-inter font-medium text-bw-white"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
            >
              Send a File
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransfers.map((t) => (
              <FileItem key={t.transferId} transfer={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
