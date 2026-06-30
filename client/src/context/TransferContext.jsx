import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { get, set, del } from '../lib/db';

const STORAGE_KEY_TRANSFERS = 'transfers';
const STORAGE_KEY_PENDING = 'pendingTransfers';

const TransferContext = createContext(null);

export function TransferProvider({ children }) {
  const [transfers, setTransfers] = useState([]);
  const [incomingFile, setIncomingFile] = useState(null);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const persistTimer = useRef(null);

  // Load persisted data on mount
  useEffect(() => {
    Promise.all([
      get(STORAGE_KEY_TRANSFERS).then(data => { if (data) setTransfers(data); }),
      get(STORAGE_KEY_PENDING).then(data => { if (data) setPendingTransfers(data); }),
    ]).finally(() => setLoaded(true));
  }, []);

  // Debounced persist to IndexedDB
  const persist = useCallback((key, data) => {
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => set(key, data), 300);
  }, []);

  const addTransfer = useCallback((transfer) => {
    setTransfers(prev => {
      const next = [transfer, ...prev];
      persist(STORAGE_KEY_TRANSFERS, next);
      return next;
    });
  }, [persist]);

  const updateTransfer = useCallback((transferId, updates) => {
    setTransfers(prev => {
      const next = prev.map(t => t.transferId === transferId ? { ...t, ...updates } : t);
      persist(STORAGE_KEY_TRANSFERS, next);
      return next;
    });
  }, [persist]);

  const removeTransfer = useCallback((transferId) => {
    setTransfers(prev => {
      const next = prev.filter(t => t.transferId !== transferId);
      persist(STORAGE_KEY_TRANSFERS, next);
      return next;
    });
  }, [persist]);

  // Pending transfer queue (for offline/resume)
  const addPending = useCallback((pending) => {
    setPendingTransfers(prev => {
      const next = [pending, ...prev];
      persist(STORAGE_KEY_PENDING, next);
      return next;
    });
  }, [persist]);

  const removePending = useCallback((transferId) => {
    setPendingTransfers(prev => {
      const next = prev.filter(t => t.transferId !== transferId);
      persist(STORAGE_KEY_PENDING, next);
      return next;
    });
  }, [persist]);

  const clearPending = useCallback(() => {
    setPendingTransfers([]);
    persist(STORAGE_KEY_PENDING, []);
  }, [persist]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(persistTimer.current);
  }, []);

  return (
    <TransferContext.Provider value={{
      transfers, addTransfer, updateTransfer, removeTransfer,
      incomingFile, setIncomingFile,
      pendingTransfers, addPending, removePending, clearPending,
      loaded,
    }}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  const ctx = useContext(TransferContext);
  if (!ctx) throw new Error('useTransfer must be used within TransferProvider');
  return ctx;
}
