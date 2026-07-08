import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        ink: {
          950: '#050914',
          900: '#0a1120',
          800: '#0f1729',
          700: '#16203a',
          600: '#1f2b47',
        },
        accent: {
          sky: '#0ea5e9',
          violet: '#a855f7',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 60px -12px rgba(34, 197, 94, 0.5)',
        'glow-sky': '0 0 60px -12px rgba(14, 165, 233, 0.45)',
        card: '0 20px 60px -25px rgba(0, 0, 0, 0.7)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 50% 0%, rgba(34,197,94,0.14), transparent 55%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.10), transparent 45%)',
        'mesh':
          'radial-gradient(at 20% 20%, rgba(34,197,94,0.18) 0px, transparent 50%), radial-gradient(at 80% 30%, rgba(14,165,233,0.16) 0px, transparent 50%), radial-gradient(at 40% 80%, rgba(168,85,247,0.14) 0px, transparent 50%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-24px) rotate(6deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float-slow 5s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite',
        'fade-up': 'fade-up 0.6s ease forwards',
      },
    },
  },
  plugins: [],
};

export default config;
