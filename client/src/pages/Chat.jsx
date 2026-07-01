import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

export default function Chat() {
  const { user } = useAuth();
  const { connected } = useSocket();
  const {
    initiateChat,
    sendChatMessage,
    sendTypingIndicator,
    chatMessages,
    chatConnected,
    chatTyping,
    chatUnreadCount,
    markChatRead,
    clearChatHistory,
    connectionState,
    remoteBwId,
    cleanup,
  } = useWebRTC();

  const [targetBwId, setTargetBwId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isValidBwId, setIsValidBwId] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const bwIdPattern = /^BW-[A-Z0-9]{6}$/;

  useEffect(() => {
    setIsValidBwId(bwIdPattern.test(targetBwId.toUpperCase()));
  }, [targetBwId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (chatConnected) {
      markChatRead();
    }
  }, [chatConnected, markChatRead, chatMessages]);

  useEffect(() => {
    if (chatConnected) inputRef.current?.focus();
  }, [chatConnected]);

  const handleConnect = useCallback(async () => {
    if (!isValidBwId || !connected) return;
    setError(null);
    setIsConnecting(true);

    try {
      const token = await user.getIdToken();
      const { connectionPromise } = await initiateChat(targetBwId.toUpperCase(), token);
      await connectionPromise;
    } catch (e) {
      setError(e.message || 'Connection failed');
      cleanup();
    } finally {
      setIsConnecting(false);
    }
  }, [isValidBwId, connected, user, initiateChat, targetBwId, cleanup]);

  const handleSendMessage = useCallback(() => {
    const text = messageText.trim();
    if (!text) return;
    if (!chatConnected) {
      setError('Connect to a peer first.');
      return;
    }
    const ok = sendChatMessage(text);
    if (ok) {
      setMessageText('');
      setError(null);
      inputRef.current?.focus();
    } else {
      setError('Message could not be sent.');
    }
  }, [messageText, chatConnected, sendChatMessage]);

  const handleTyping = useCallback((e) => {
    setMessageText(e.target.value);
    sendTypingIndicator(e.target.value.length > 0);
  }, [sendTypingIndicator]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleDisconnect = useCallback(() => {
    cleanup();
    setIsConnecting(false);
  }, [cleanup]);

  const handleClear = useCallback(() => {
    clearChatHistory();
    setError(null);
  }, [clearChatHistory]);

  return (
    <div className={`flex-1 max-w-[720px] mx-auto px-8 py-10 page-enter flex flex-col ${chatConnected ? 'h-screen' : ''}`}>
      <div className="stagger-1 shrink-0">
        <h1 className="text-bw-white font-space-grotesk font-bold text-3xl">Chat</h1>
        <p className="text-bw-muted font-inter text-sm mt-1">
          Encrypted messages, direct device-to-device — no server storage.
        </p>
      </div>

      {/* Connection form */}
      {!chatConnected && (
        <div className="mt-8 space-y-4 stagger-2">
          <div className="space-y-2">
            <label className="text-bw-muted text-xs font-space-grotesk font-bold tracking-widest uppercase">
              Connect to BlackWhole ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  placeholder="BW-XXXXXX"
                  value={targetBwId}
                  onChange={(e) =>
                    setTargetBwId(e.target.value.toUpperCase().slice(0, 9))
                  }
                  className="w-full px-4 py-3.5 rounded-input bg-bw-surface border text-bw-purple-lt font-jetbrains-mono text-lg outline-none transition-all duration-300"
                  style={{
                    borderColor: isValidBwId ? 'rgba(124,58,237,0.5)' : 'var(--bw-border)',
                    letterSpacing: '0.1em',
                    boxShadow: isValidBwId ? '0 0 15px rgba(124,58,237,0.15)' : 'none',
                  }}
                  disabled={isConnecting}
                />
                {isValidBwId && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-bw-green text-lg animate-scaleIn">
                    ✓
                  </span>
                )}
              </div>
              <button
                onClick={handleConnect}
                disabled={!isValidBwId || isConnecting || !connected}
                className="px-8 py-3.5 rounded-button text-sm font-inter font-semibold text-bw-white transition-all duration-300 shrink-0 hover:scale-105 active:scale-95"
                style={{
                  background: !isValidBwId || isConnecting || !connected
                    ? 'rgba(124,58,237,0.2)'
                    : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  boxShadow: isValidBwId && !isConnecting && connected
                    ? '0 0 20px rgba(124,58,237,0.25)'
                    : 'none',
                  opacity: isValidBwId && !isConnecting && connected ? 1 : 0.5,
                  cursor: isValidBwId && !isConnecting && connected ? 'pointer' : 'not-allowed',
                }}
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-bw-gold animate-pulseGlow" />
                    Connecting...
                  </span>
                ) : 'Connect'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-button bg-bw-red/10 border border-bw-red/30 p-4 text-bw-red text-sm font-inter animate-fadeIn">
              <span className="mr-2">⚠</span>
              {error}
            </div>
          )}

          <div className="rounded-card bg-bw-surface/50 border border-bw-border/50 p-6 text-center animate-fadeUp">
            <div className="text-4xl mb-3 inline-block animate-float">💬</div>
            <p className="text-bw-muted font-inter text-sm">
              Enter a BW-ID and connect to start chatting
            </p>
          </div>
        </div>
      )}

      {/* Chat interface */}
      {chatConnected && (
        <div className="flex-1 flex flex-col mt-6 min-h-0 gap-4 animate-fadeIn">
          {/* Connection bar */}
          <div className="flex items-center justify-between stagger-1 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="w-3 h-3 rounded-full bg-bw-green block animate-pulseGlow" />
                <span className="absolute inset-0 w-3 h-3 rounded-full bg-bw-green animate-ping opacity-30" />
              </div>
              <div>
                <span className="text-bw-green text-sm font-inter font-medium">
                  Connected
                </span>
                <span className="text-bw-muted text-xs font-jetbrains-mono ml-2">
                  {remoteBwId}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-button text-xs font-inter text-bw-muted border border-bw-border hover:bg-bw-surface transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-button text-xs font-inter text-bw-red border border-bw-red/30 hover:bg-bw-red/10 transition-all hover:scale-105 active:scale-95"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto space-y-2 rounded-card bg-bw-surface/50 border border-bw-border/50 p-4 min-h-0"
            style={{ maxHeight: 'calc(100vh - 320px)' }}
          >
            {chatMessages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-3xl mb-2 animate-float">💬</div>
                  <p className="text-bw-muted font-inter text-sm">Send a message to start the conversation</p>
                </div>
              </div>
            )}
            {chatTyping && (
              <div className="flex justify-start animate-fadeUp">
                <div className="rounded-2xl rounded-bl-md border border-bw-border bg-[var(--bw-card)] px-4 py-2.5 text-sm text-bw-muted">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-bw-purple" />
                    <span className="h-2 w-2 rounded-full bg-bw-purple/70" />
                    <span className="h-2 w-2 rounded-full bg-bw-purple/40" />
                  </span>
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'} animate-fadeUp`}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 text-sm font-inter ${
                    msg.direction === 'sent'
                      ? 'text-bw-white rounded-2xl rounded-br-md'
                      : 'text-bw-white rounded-2xl rounded-bl-md'
                  }`}
                  style={
                    msg.direction === 'sent'
                      ? {
                          background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                          boxShadow: '0 2px 10px rgba(124,58,237,0.2)',
                        }
                      : {
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(30, 41, 59, 0.5)',
                        }
                  }
                >
                  <p className="break-words whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1.5 ${
                    msg.direction === 'sent' ? 'text-bw-purple-lt/60' : 'text-bw-muted/60'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 shrink-0 stagger-2">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-4 py-3.5 rounded-input bg-bw-surface border border-bw-border/50 text-bw-white font-inter text-sm outline-none transition-all duration-300 focus:border-bw-purple/50 resize-none"
              style={{
                minHeight: 48,
                boxShadow: messageText.trim() ? '0 0 10px rgba(124,58,237,0.08)' : 'none',
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="px-6 py-3.5 rounded-button text-sm font-inter font-semibold text-bw-white transition-all duration-300 shrink-0 self-end hover:scale-105 active:scale-95"
              style={{
                background: messageText.trim()
                  ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
                  : 'rgba(124,58,237,0.2)',
                boxShadow: messageText.trim() ? '0 0 15px rgba(124,58,237,0.2)' : 'none',
                opacity: messageText.trim() ? 1 : 0.5,
                cursor: messageText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Send →
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mt-auto pt-6 text-xs text-bw-muted font-inter text-center shrink-0 stagger-3">
        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
          connected ? 'bg-bw-green' : 'bg-bw-red animate-breathe'
        }`} />
        {connected
          ? `Connected to signaling server${chatConnected ? ' · 🔒 End-to-end encrypted' : ''}`
          : 'Connecting to signaling server…'}
      </div>
    </div>
  );
}
