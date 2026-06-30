import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useTransfer } from '../context/TransferContext';

/**
 * Auto-resumes pending transfers when the socket reconnects.
 * Works in the background — picks the oldest pending transfer and retries it.
 */
export function useAutoResume() {
  const { socket, connected } = useSocket();
  const { pendingTransfers, removePending, addTransfer } = useTransfer();
  const retryingRef = useRef(false);

  const retryPending = useCallback(async () => {
    if (retryingRef.current || pendingTransfers.length === 0) return;
    retryingRef.current = true;

    const pending = [...pendingTransfers];
    for (const p of pending) {
      if (!navigator.onLine || !socket?.connected) break;

      try {
        // Mark as retrying in history
        addTransfer({
          ...p,
          status: 'retrying',
          timestamp: new Date().toISOString(),
        });

        // Emit a signal that we're retrying — the UI can pick this up
        socket.emit('transfer-retry', {
          targetBwId: p.peerBwId,
          transferId: p.transferId,
        });
      } catch (e) {
        console.error('Auto-resume failed for', p.transferId, e);
      }
    }

    retryingRef.current = false;
  }, [pendingTransfers, socket, addTransfer]);

  useEffect(() => {
    if (connected && pendingTransfers.length > 0) {
      retryPending();
    }
  }, [connected, pendingTransfers.length, retryPending]);
}
