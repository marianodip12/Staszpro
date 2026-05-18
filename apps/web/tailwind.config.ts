import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#03050F',
          900: '#080D1C',
          800: '#0D1428',
          700: '#121B35',
          600: '#1A2547',
          500: '#243159',
          400: '#334473',
        },
      },
      animation: {
        'fade-up': 'fadeUp .35s cubic-bezier(.22,1,.36,1) both',
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)'   },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(37,99,235,.25)',
      },
    },
  },
  plugins: [],
};

export default config;
