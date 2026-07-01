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
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleGetStarted = () => {
    navigate('/auth');
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

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-bw-purple to-bw-cyan text-sm font-bold text-bw-white">
            B
          </div>
          <span className="font-space-grotesk text-xl font-bold text-bw-white">BlackWhole</span>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <a href="#how" className="text-sm font-inter text-bw-muted transition-colors hover:text-bw-white">How it works</a>
          <a href="#security" className="text-sm font-inter text-bw-muted transition-colors hover:text-bw-white">Security</a>
          <a href="#docs" className="text-sm font-inter text-bw-muted transition-colors hover:text-bw-white">Docs</a>
          <button
            onClick={handleGetStarted}
            className="rounded-pill px-5 py-2.5 text-sm font-inter font-medium text-bw-white"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            }}
          >
            Open app
          </button>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-8 pt-16 pb-16">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center gap-2 text-sm font-inter font-medium text-bw-green">
              <span className="inline-block h-2 w-2 rounded-full bg-bw-green" />
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

            <p className="max-w-lg text-lg leading-relaxed text-bw-muted font-inter">
              Send any file — video, audio, document, anything — directly to any device. No upload wait. No size limit. No cloud middleman.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={handleGetStarted}
                className="rounded-pill px-8 py-4 text-base font-inter font-semibold text-bw-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  boxShadow: '0 0 30px rgba(124, 58, 237, 0.4)',
                }}
              >
                🚀 Start Sending Free
              </button>
              <button className="rounded-pill border border-bw-border px-8 py-4 text-base font-inter font-medium text-bw-white transition-all hover:bg-bw-surface" style={{ backdropFilter: 'blur(10px)' }}>
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
                <span key={pill.label} className="rounded-pill border border-bw-border bg-bw-surface/50 px-3 py-1.5 text-xs font-jetbrains-mono text-bw-muted">
                  {pill.icon} {pill.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative animate-float">
              <BlackHole size={420} />
              <div
                className="absolute -top-4 -right-4 rounded-card border border-bw-border px-3 py-1.5 text-xs font-jetbrains-mono text-bw-white"
                style={{ backdropFilter: 'blur(10px)', background: 'rgba(17,24,39,0.8)', animation: 'float 5s ease-in-out infinite' }}
              >
                🎬 4K Video → Received
              </div>
              <div
                className="absolute -bottom-2 -left-8 rounded-card border border-bw-border px-3 py-1.5 text-xs font-jetbrains-mono text-bw-white"
                style={{ backdropFilter: 'blur(10px)', background: 'rgba(17,24,39,0.8)', animation: 'float 7s ease-in-out infinite 1s' }}
              >
                ⚡ 1.2 GB in 18 seconds
              </div>
            </div>
          </div>
        </div>

        <section id="how" className="mt-16 grid gap-4 md:grid-cols-3">
          {['Secure transfers', 'Instant delivery', 'Cross-device access'].map((title, idx) => (
            <div key={title} className="rounded-[28px] border border-bw-border bg-bw-surface/55 p-6 backdrop-blur-xl">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-bw-purple to-bw-cyan text-xl text-white">
                {['🔐', '⚡', '📱'][idx]}
              </div>
              <h3 className="font-space-grotesk text-xl font-semibold text-bw-white">{title}</h3>
              <p className="mt-2 text-sm text-bw-muted">Fast, protected transfers designed for global collaboration.</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-bw-border/50 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.18))]">
        <div className="mx-auto grid max-w-7xl gap-4 px-8 py-8 text-sm text-bw-muted md:grid-cols-3">
          <div>
            <div className="mb-3 font-space-grotesk text-base font-semibold text-bw-white">BlackWhole</div>
            <p>Global, encrypted file sharing for teams and creators.</p>
          </div>
          <div>
            <div className="mb-3 font-semibold text-bw-white">Resources</div>
            <div className="space-y-2">
              <a href="#how" className="block hover:text-bw-white">How it works</a>
              <a href="#security" className="block hover:text-bw-white">Security</a>
              <a href="#docs" className="block hover:text-bw-white">Docs</a>
            </div>
          </div>
          <div>
            <div className="mb-3 font-semibold text-bw-white">Contact</div>
            <div className="space-y-2">
              <span className="block">support@blackwhole.app</span>
              <span className="block">+1 (800) 555-0199</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
