import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BlackHole from '../components/BlackHole';
import { useEffect } from 'react';

const stars = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 1 + Math.random() * 2,
  delay: Math.random() * 3,
}));

export default function Landing() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleGetStarted = () => {
    if (user) navigate('/dashboard');
    else signInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-bw-void relative overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-bw-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `twinkle 3s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bw-purple to-bw-cyan flex items-center justify-center text-sm font-bold text-bw-white">
            B
          </div>
          <span className="text-bw-white font-space-grotesk font-bold text-xl">BlackWhole</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how" className="text-bw-muted hover:text-bw-white text-sm font-inter transition-colors">How it works</a>
          <a href="#security" className="text-bw-muted hover:text-bw-white text-sm font-inter transition-colors">Security</a>
          <a href="#docs" className="text-bw-muted hover:text-bw-white text-sm font-inter transition-colors">Docs</a>
          <button
            onClick={handleGetStarted}
            className="px-5 py-2.5 rounded-pill text-sm font-inter font-medium text-bw-white"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            }}
          >
            Sign in with Google
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center gap-2 text-bw-green text-sm font-inter font-medium">
              <span className="w-2 h-2 rounded-full bg-bw-green inline-block" />
              P2P • Encrypted • No limits
            </div>

            <h1 className="font-space-grotesk font-black leading-none" style={{ fontSize: '64px', letterSpacing: '-0.04em' }}>
              <span className="text-bw-white">Drop it in.</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                It arrives.
              </span>
            </h1>

            <p className="text-bw-muted font-inter text-lg max-w-lg leading-relaxed">
              Send any file — video, audio, document, anything — directly to any device. No upload wait. No size limit. No cloud middleman.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 rounded-pill text-base font-inter font-semibold text-bw-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  boxShadow: '0 0 30px rgba(124, 58, 237, 0.4)',
                }}
              >
                🚀 Start Sending Free
              </button>
              <button className="px-8 py-4 rounded-pill text-base font-inter font-medium text-bw-white border border-bw-border transition-all hover:bg-bw-surface" style={{ backdropFilter: 'blur(10px)' }}>
                See how it works →
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              {[
                { icon: '⚡', label: 'Local LAN speed' },
                { icon: '🔒', label: 'DTLS 1.3 encrypted' },
                { icon: '♻️', label: 'Auto-resume' },
                { icon: '💾', label: 'Auto-save' },
              ].map((pill) => (
                <span key={pill.label} className="px-3 py-1.5 rounded-pill text-xs font-jetbrains-mono text-bw-muted border border-bw-border bg-bw-surface/50">
                  {pill.icon} {pill.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-center items-center">
            <div className="relative animate-float">
              <BlackHole size={420} />
              <div
                className="absolute -top-4 -right-4 px-3 py-1.5 rounded-card text-xs font-jetbrains-mono text-bw-white border border-bw-border"
                style={{ backdropFilter: 'blur(10px)', background: 'rgba(17,24,39,0.8)', animation: 'float 5s ease-in-out infinite' }}
              >
                🎬 4K Video → Received
              </div>
              <div
                className="absolute -bottom-2 -left-8 px-3 py-1.5 rounded-card text-xs font-jetbrains-mono text-bw-white border border-bw-border"
                style={{ backdropFilter: 'blur(10px)', background: 'rgba(17,24,39,0.8)', animation: 'float 7s ease-in-out infinite 1s' }}
              >
                ⚡ 1.2 GB in 18 seconds
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
