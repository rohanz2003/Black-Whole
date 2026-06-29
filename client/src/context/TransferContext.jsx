import { createContext, useContext, useState, useCallback } from 'react';

const TransferContext = createContext(null);

export function TransferProvider({ children }) {
  const [transfers, setTransfers] = useState([]);
  const [incomingFile, setIncomingFile] = useState(null);

  const addTransfer = useCallback((transfer) => {
    setTransfers(prev => [transfer, ...prev]);
  }, []);

  const updateTransfer = useCallback((transferId, updates) => {
    setTransfers(prev => prev.map(t => t.transferId === transferId ? { ...t, ...updates } : t));
  }, []);

  const removeTransfer = useCallback((transferId) => {
    setTransfers(prev => prev.filter(t => t.transferId !== transferId));
  }, []);

  return (
    <TransferContext.Provider value={{ transfers, addTransfer, updateTransfer, removeTransfer, incomingFile, setIncomingFile }}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  const ctx = useContext(TransferContext);
  if (!ctx) throw new Error('useTransfer must be used within TransferProvider');
  return ctx;
}
