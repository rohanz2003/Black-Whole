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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    setVisible(true);
  }, []);

  const sentCount = transfers.filter(t => t.direction === 'sent' && t.status === 'completed').length;
  const receivedCount = transfers.filter(t => t.direction === 'received' && t.status === 'completed').length;
  const pendingCount = transfers.filter(t => t.status === 'pending' || t.status === 'retrying').length;
  const totalSize = transfers.reduce((acc, t) => acc + (t.fileSize || 0), 0);
  const recentTransfers = transfers.slice(0, 5);

  const statCards = [
    {
      icon: '📤', label: 'Files Sent', value: sentCount,
      color: 'text-bw-cyan', border: 'border-bw-cyan/20', bg: 'bg-bw-cyan/5',
    },
    {
      icon: '📥', label: 'Files Received', value: receivedCount,
      color: 'text-bw-green', border: 'border-bw-green/20', bg: 'bg-bw-green/5',
    },
    {
      icon: '⏳', label: 'Pending', value: pendingCount,
      color: 'text-bw-gold', border: 'border-bw-gold/20', bg: 'bg-bw-gold/5',
    },
    {
      icon: '⚡', label: 'Data Transferred', value: formatFileSize(totalSize),
      color: 'text-bw-purple-lt', border: 'border-bw-purple/20', bg: 'bg-bw-purple/5',
    },
  ];

  return (
    <div className={`flex-1 max-w-[920px] mx-auto px-8 py-10 ${visible ? 'page-enter' : 'opacity-0'}`}>
      {/* Greeting */}
      <div className="stagger-1">
        <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">
          {greeting}, <span className="text-bw-purple-lt">{user?.displayName?.split(' ')[0] || 'there'}</span>
          <span className="inline-block animate-float ml-1">👋</span>
        </h1>
        <p className="text-bw-muted font-inter text-sm mt-1">
          Ready to send something into the void?
        </p>
      </div>

      {/* BW-ID Card */}
      <div className="mt-8 stagger-2">
        <BwIdCard bwId={user?.bwId} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className={`rounded-card bg-bw-surface border ${stat.border} ${stat.bg} p-5 card-hover stagger-${i + 3}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`text-xs font-jetbrains-mono ${stat.color}`}>●</span>
            </div>
            <p className={`text-3xl font-bold font-jetbrains-mono mt-3 ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-bw-muted text-sm font-inter mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Transfers */}
      <div className="mt-10 stagger-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-bw-white font-space-grotesk font-bold text-lg">Recent Transfers</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-bw-purple-lt text-sm font-inter hover:text-bw-white transition-colors group"
          >
            View all
            <span className="inline-block transition-transform group-hover:translate-x-1 ml-1">→</span>
          </button>
        </div>

        {recentTransfers.length === 0 ? (
          <div className="rounded-card bg-bw-surface border border-bw-border p-12 text-center">
            <div className="text-5xl mb-4 animate-float inline-block">⬛</div>
            <p className="text-bw-muted font-inter text-sm">No transfers yet. Send your first file!</p>
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
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransfers.map((t, i) => (
              <div key={t.transferId} style={{ animation: `slideUp 0.4s ease-out ${i * 0.06}s both` }}>
                <FileItem transfer={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
