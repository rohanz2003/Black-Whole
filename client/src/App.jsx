import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { TransferProvider } from './context/TransferContext';
import { WebRTCProvider } from './context/WebRTCContext';
import { useAuth } from './context/AuthContext';
import { useTransfer } from './context/TransferContext';
import { useAutoResume } from './hooks/useAutoResume';
import ProtectedRoute from './components/ProtectedRoute';
import OnlineStatus from './components/OnlineStatus';
import ThemeToggle from './components/ThemeToggle';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Send from './pages/Send';
import Chat from './pages/Chat';
import History from './pages/History';
import Profile from './pages/Profile';
import IncomingToast from './components/IncomingToast';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/send', label: 'Send' },
  { to: '/chat', label: 'Chat' },
  { to: '/history', label: 'History' },
  { to: '/profile', label: 'Profile' },
];

function AppLayout({ children }) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bw-void)] text-[var(--bw-text)]">
      <div className="sticky top-0 z-40 border-b border-[var(--bw-border)] bg-[var(--bw-surface)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--bw-purple)] to-[var(--bw-cyan)] text-lg font-bold text-white shadow-[0_0_25px_rgba(124,58,237,0.4)]">
              B
            </div>
            <div>
              <div className="font-space-grotesk text-base font-semibold tracking-tight text-[var(--bw-text)]">BlackWhole</div>
              <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--bw-muted)]">Transfer Hub</div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive ? 'bg-[var(--bw-purple)]/15 text-[var(--bw-purple)]' : 'text-[var(--bw-muted)] hover:text-[var(--bw-text)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <button
                onClick={signOut}
                className="hidden rounded-full border border-[var(--bw-border)] px-4 py-2 text-sm font-medium text-[var(--bw-muted)] transition hover:text-[var(--bw-red)] sm:inline-flex"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

/**
 * Resets incoming-file toast when the user signs out.
 * (Receive handling itself is now done globally in WebRTCContext.)
 */
function AppContent() {
  const { user } = useAuth();
  const { incomingFile, setIncomingFile } = useTransfer();

  useAutoResume();

  useEffect(() => {
    if (!user) setIncomingFile(null);
  }, [user, setIncomingFile]);

  return (
    <>
      <OnlineStatus />
      <IncomingToast incomingFile={incomingFile} onDismiss={() => setIncomingFile(null)} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/send"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Send />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Chat />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <AppLayout>
                <History />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TransferProvider>
          {/*
           * WebRTCProvider must be inside both AuthProvider (needs user token)
           * and TransferProvider (updates incomingFile / addTransfer).
           * Being at App root means any page can receive files automatically.
           */}
          <WebRTCProvider>
            <AppContent />
          </WebRTCProvider>
        </TransferProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
