/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary, #130c0a)',
          secondary: 'var(--bg-secondary, #1a100d)',
          card: 'var(--bg-card, #241712)',
          cardHover: 'var(--bg-card-hover, #2f1e18)',
          active: 'var(--bg-active, #38231a)',
        },
        accent: {
          DEFAULT: 'var(--accent-color, #ff7b72)',
          hover: 'var(--accent-hover, #ff928a)',
          glow: 'var(--accent-glow, rgba(255, 123, 114, 0.25))',
          muted: 'var(--accent-muted, rgba(255, 123, 114, 0.15))',
        },
        warm: {
          white: '#f7eee9',
          muted: '#9c8a82',
          subtle: '#66564f',
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
