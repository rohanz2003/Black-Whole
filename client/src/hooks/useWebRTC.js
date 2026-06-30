/**
 * useWebRTC.js
 *
 * Thin proxy to the global WebRTCContext.
 * All logic lives in WebRTCContext.jsx — this hook exists for backward
 * compatibility so Send.jsx doesn't need a large refactor.
 *
 * Old signature: useWebRTC(socket, connected)  ← no longer needed; the context
 *                                                handles socket internally.
 * New signature: useWebRTC()
 */
import { useWebRTCContext } from '../context/WebRTCContext';

export function useWebRTC() {
  return useWebRTCContext();
}
