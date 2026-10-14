/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary, #0b0e14)',
          secondary: 'var(--bg-secondary, #111622)',
          card: 'var(--bg-card, rgba(255, 255, 255, 0.04))',
          cardHover: 'var(--bg-card-hover, rgba(255, 255, 255, 0.08))',
          active: 'var(--bg-active, rgba(255, 255, 255, 0.12))',
        },
        accent: {
          DEFAULT: 'var(--accent-color, #00a8e1)',
          hover: 'var(--accent-hover, #22d3ee)',
          glow: 'var(--accent-glow, rgba(0, 168, 225, 0.35))',
          muted: 'var(--accent-muted, rgba(0, 168, 225, 0.15))',
        },
        warm: {
          white: '#ffffff',
          muted: '#a1a1aa',
          subtle: '#71717a',
          border: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"SF Pro"', 'system-ui', 'sans-serif'],
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
