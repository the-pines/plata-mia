import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lemon: {
          DEFAULT: '#FFD60A',
          bright: '#FFE548',
          dark: '#D4A900',
          muted: 'rgba(255,214,10,0.10)',
          glow: 'rgba(255,214,10,0.30)',
        },
        surface: {
          DEFAULT: '#0F0F0F',
          hover: '#141414',
          page: '#0A0A0A',
        },
        border: {
          DEFAULT: '#1A1A1A',
          hover: '#2A2A2A',
          active: '#3A3A3A',
        },
        primary: '#F0F0F0',
        secondary: '#999999',
        tertiary: '#606060',
        accent: {
          blue: '#5B9AFF',
          'blue-muted': 'rgba(91,154,255,0.10)',
          green: '#34D399',
          'green-muted': 'rgba(52,211,153,0.10)',
          red: '#FF6B6B',
          'red-muted': 'rgba(255,107,107,0.10)',
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
          '50%': { opacity: '0.85' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        scanline: {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        flicker: 'flicker 2s ease-in-out infinite',
        'slide-up': 'slide-up 200ms ease-out',
        scanline: 'scanline 8s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
