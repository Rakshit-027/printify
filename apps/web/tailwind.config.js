/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAF7F2',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#0E1A3A',
          soft: '#4A5578',
        },
        hairline: '#E7E1D6',
        saffron: {
          DEFAULT: '#FF8A1F',
          tint: '#FFF1E0',
        },
        success: {
          DEFAULT: '#14A36B',
          tint: '#E4F6EE',
        },
        warning: '#E8A200',
        danger: '#D64545',
      },
      fontFamily: {
        sora: ['var(--font-sora)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
        hindi: ['var(--font-noto-sans-devanagari)', 'sans-serif'],
      },
      borderRadius: {
        '20': '20px',
        '14': '14px',
        'pill': '999px',
      },
      boxShadow: {
        'ink-soft': '0 1px 2px rgba(14,26,58,0.06), 0 12px 32px -12px rgba(14,26,58,0.18)',
      },
      keyframes: {
        countUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        stamp: {
          '0%': { transform: 'scale(1.5)', opacity: '0' },
          '50%': { transform: 'scale(0.9)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
      animation: {
        countUp: 'countUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        stamp: 'stamp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      }
    },
  },
  plugins: [],
};
