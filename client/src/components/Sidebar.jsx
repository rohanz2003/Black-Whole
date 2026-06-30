import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTransfer } from '../context/TransferContext';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/send', label: 'Send File', icon: '⬛' },
  { to: '/chat', label: 'Chat', icon: '💬' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { pendingTransfers } = useTransfer();
  const [online, setOnline] = useState(navigator.onLine);
  const initial = (user?.displayName || user?.email || 'U')[0].toUpperCase();

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <div
      className="w-[240px] h-screen sticky top-0 flex flex-col py-6 px-3 shrink-0 z-40"
      style={{
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(10, 10, 15, 0.75)',
        borderRight: '1px solid rgba(30, 41, 59, 0.4)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-10">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-bw-white"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            boxShadow: '0 0 15px rgba(124,58,237,0.3)',
          }}
        >
          ⬛
        </div>
        <span className="text-bw-white font-space-grotesk font-bold text-lg tracking-tight">
          BlackWhole
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between gap-3 px-4 py-2.5 rounded-button text-sm font-inter transition-all duration-200 ${
                isActive
                  ? 'font-medium'
                  : 'text-bw-muted hover:text-bw-white'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'rgba(124,58,237,0.12)',
                    borderLeft: '3px solid #7C3AED',
                    color: '#A78BFA',
                    boxShadow: '0 0 10px rgba(124,58,237,0.05)',
                  }
                : {}
            }
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </div>
            {item.to === '/history' && pendingTransfers.length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-jetbrains-mono font-bold animate-scaleIn"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  color: '#F59E0B',
                }}
              >
                {pendingTransfers.length}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="flex items-center gap-3 px-3 pt-4 mt-2 border-t border-bw-border/50">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-bw-white shrink-0"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            boxShadow: '0 0 15px rgba(124,58,237,0.2)',
          }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-bw-white text-xs font-inter font-medium truncate">
              {user?.displayName || 'User'}
            </p>
            <span
              className={`w-2 h-2 rounded-full ${
                online ? 'bg-bw-green' : 'bg-bw-red'
              } ${online ? 'animate-pulseGlow' : ''}`}
            />
          </div>
          <p className="text-bw-muted text-[10px] font-jetbrains-mono truncate">
            {user?.bwId || ''}
          </p>
        </div>
        <button
          onClick={signOut}
          className="text-bw-muted hover:text-bw-red transition-colors text-sm hover:scale-110 active:scale-90"
          title="Sign out"
        >
          ⏻
        </button>
      </div>
    </div>
  );
}
