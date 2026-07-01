import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('bw-theme');
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('bw-theme', theme);
  }, [theme]);

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--bw-border)] bg-[var(--bw-surface)] text-[var(--bw-text)] shadow-sm transition-all hover:scale-105"
    >
      <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
    </button>
  );
}
