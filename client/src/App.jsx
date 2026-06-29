import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { TransferProvider, useTransfer } from './context/TransferContext';
import { useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Send from './pages/Send';
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

function SocketListener() {
  const { socket, connected } = useSocket();
  const { setIncomingFile } = useTransfer();

  useEffect(() => {
    if (!socket || !connected) return;
    const handler = (data) => {
      setIncomingFile(data);
    };
    socket.on('transfer-meta', handler);
    return () => socket.off('transfer-meta', handler);
  }, [socket, connected, setIncomingFile]);

  return null;
}

function AppContent() {
  const { user } = useAuth();
  const { incomingFile, setIncomingFile } = useTransfer();

  useEffect(() => {
    if (!user) setIncomingFile(null);
  }, [user, setIncomingFile]);

  return (
    <>
      {user && <SocketListener />}
      <IncomingToast incomingFile={incomingFile} onDismiss={() => setIncomingFile(null)} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
        } />
        <Route path="/send" element={
          <ProtectedRoute><AppLayout><Send /></AppLayout></ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute><AppLayout><History /></AppLayout></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>
        } />
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
          <AppContent />
        </TransferProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
