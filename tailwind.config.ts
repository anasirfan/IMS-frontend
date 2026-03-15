import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        stealth: {
          DEFAULT: '#232B2B',
          50: '#2a3333',
          100: '#232B2B',
          200: '#1c2323',
          300: '#161c1c',
          400: '#101515',
          500: '#0a0e0e',
          600: '#080b0b',
          surface: '#1a2222',
          card: 'rgba(30, 40, 40, 0.6)',
          overlay: 'rgba(26, 34, 34, 0.8)',
        },
        emerald: {
          DEFAULT: '#50C878',
          50: '#eefbf3',
          100: '#d5f5e1',
          200: '#abebC3',
          300: '#72d89a',
          400: '#50C878',
          500: '#3ab564',
          600: '#2d9450',
          glow: 'rgba(80, 200, 120, 0.15)',
          muted: 'rgba(80, 200, 120, 0.08)',
        },
        eton: {
          DEFAULT: '#96C8A2',
          50: '#f2f8f4',
          100: '#e0efe4',
          200: '#c1dfc9',
          300: '#96C8A2',
        },
        glass: {
          border: 'rgba(255, 255, 255, 0.06)',
          'border-hover': 'rgba(255, 255, 255, 0.1)',
          'border-emerald': 'rgba(80, 200, 120, 0.2)',
          white5: 'rgba(255, 255, 255, 0.05)',
          white8: 'rgba(255, 255, 255, 0.08)',
          white10: 'rgba(255, 255, 255, 0.10)',
          white15: 'rgba(255, 255, 255, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 4px 30px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.4)',
        glow: '0 0 20px rgba(80, 200, 120, 0.15)',
        'glow-sm': '0 0 10px rgba(80, 200, 120, 0.1)',
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(80, 200, 120, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(80, 200, 120, 0.2)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
