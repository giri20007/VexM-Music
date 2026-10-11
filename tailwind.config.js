/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary, #090a10)',
          secondary: 'var(--bg-secondary, #11131c)',
          card: 'var(--bg-card, rgba(255, 255, 255, 0.04))',
          cardHover: 'var(--bg-card-hover, rgba(255, 255, 255, 0.08))',
          active: 'var(--bg-active, rgba(255, 255, 255, 0.12))',
        },
        accent: {
          DEFAULT: 'var(--accent-color, #fa2d48)',
          hover: 'var(--accent-hover, #ff3b53)',
          glow: 'var(--accent-glow, rgba(250, 45, 72, 0.35))',
          muted: 'var(--accent-muted, rgba(250, 45, 72, 0.15))',
        },
        warm: {
          white: '#ffffff',
          muted: '#a1a1aa',
          subtle: '#71717a',
          border: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'scale-up': 'scaleUp 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
