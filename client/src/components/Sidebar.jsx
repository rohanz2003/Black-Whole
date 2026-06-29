import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/send', label: 'Send File', icon: '⬛' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const initial = (user?.displayName || user?.email || 'U')[0].toUpperCase();

  return (
    <div
      className="w-[220px] h-screen sticky top-0 flex flex-col py-6 px-4 shrink-0"
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(10, 10, 15, 0.8)',
        borderRight: '1px solid rgba(30, 41, 59, 0.5)',
      }}
    >
      <div className="flex items-center gap-2 px-2 mb-10">
        <div className="w-8 h-8 rounded-full bg-bw-purple flex items-center justify-center text-sm font-bold text-bw-white">
          B
        </div>
        <span className="text-bw-white font-space-grotesk font-bold text-lg">BlackWhole</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-button text-sm font-inter transition-all ${
                isActive
                  ? 'text-bw-purple-lt font-medium'
                  : 'text-bw-muted hover:text-bw-white'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'rgba(124,58,237,0.15)', borderLeft: '3px solid #7C3AED' }
                : {}
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 px-2 pt-4 border-t border-bw-border">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-bw-white shrink-0"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
          }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-bw-white text-xs font-inter truncate">{user?.displayName || 'User'}</p>
          <p className="text-bw-muted text-[10px] font-jetbrains-mono truncate">{user?.bwId || ''}</p>
        </div>
        <button onClick={signOut} className="text-bw-muted hover:text-bw-red transition-colors text-sm" title="Sign out">
          ⏻
        </button>
      </div>
    </div>
  );
}
