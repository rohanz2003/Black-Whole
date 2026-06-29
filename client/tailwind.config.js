/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bw-void': '#0A0A0F',
        'bw-surface': '#111827',
        'bw-border': '#1E293B',
        'bw-purple': '#7C3AED',
        'bw-purple-lt': '#A78BFA',
        'bw-cyan': '#06B6D4',
        'bw-white': '#F8FAFC',
        'bw-muted': '#94A3B8',
        'bw-gold': '#F59E0B',
        'bw-green': '#10B981',
        'bw-red': '#EF4444',
      },
      fontFamily: {
        'space-grotesk': ['Space Grotesk', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'jetbrains-mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'pill': '9999px',
        'input': '12px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(124, 58, 237, 0.5)',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        incoming: {
          from: { transform: 'translateX(120%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        }
      },
      animation: {
        twinkle: 'twinkle 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        fadeIn: 'fadeIn 0.5s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
        incoming: 'incoming 0.5s ease-out',
      }
    },
  },
  plugins: [],
};