import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        phosphor: {
          DEFAULT: '#00FF41',
          bright: '#33FF66',
          dark: '#00CC33',
          muted: 'rgba(0,255,65,0.10)',
          glow: 'rgba(0,255,65,0.30)',
        },
        surface: {
          DEFAULT: '#0A0F0A',
          hover: '#0F160F',
          page: '#050805',
        },
        border: {
          DEFAULT: '#0D1A0D',
          hover: '#153015',
          active: '#1A3A1A',
        },
        primary: '#C0FFC0',
        secondary: '#5A8A5A',
        tertiary: '#2D4D2D',
        accent: {
          cyan: '#00FFFF',
          'cyan-muted': 'rgba(0,255,255,0.08)',
          green: '#00FF41',
          'green-muted': 'rgba(0,255,65,0.08)',
          red: '#FF3333',
          'red-muted': 'rgba(255,51,51,0.08)',
          amber: '#FFAA00',
          'amber-muted': 'rgba(255,170,0,0.08)',
        },
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.7' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.85' },
          '97%': { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        scanline: {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(100vh)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(0,255,65,0.3), 0 0 8px rgba(0,255,65,0.1)' },
          '50%': { boxShadow: '0 0 8px rgba(0,255,65,0.5), 0 0 16px rgba(0,255,65,0.2)' },
        },
        'text-glow': {
          '0%, 100%': { textShadow: '0 0 4px rgba(0,255,65,0.4)' },
          '50%': { textShadow: '0 0 8px rgba(0,255,65,0.6), 0 0 16px rgba(0,255,65,0.2)' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        flicker: 'flicker 4s ease-in-out infinite',
        'slide-up': 'slide-up 200ms ease-out',
        scanline: 'scanline 6s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'text-glow': 'text-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
