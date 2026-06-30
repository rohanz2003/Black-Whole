import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { TransferProvider } from './context/TransferContext';
import { WebRTCProvider } from './context/WebRTCContext';
import { useAuth } from './context/AuthContext';
import { useTransfer } from './context/TransferContext';
import { useAutoResume } from './hooks/useAutoResume';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import OnlineStatus from './components/OnlineStatus';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Send from './pages/Send';
import Chat from './pages/Chat';
import History from './pages/History';
import Profile from './pages/Profile';
import IncomingToast from './components/IncomingToast';

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-bw-void">
      <Sidebar />
      <main className="flex-1">{children}</main>
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
