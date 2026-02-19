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
          DEFAULT: '#FACC15',
          bright: '#FDE047',
          dark: '#CA8A04',
          muted: 'rgba(250,204,21,0.08)',
          glow: 'rgba(250,204,21,0.25)',
        },
        surface: {
          DEFAULT: '#0F0F0F',
          hover: '#141414',
          page: '#0A0A0A',
        },
        border: {
          DEFAULT: '#1A1A1A',
          hover: '#2A2A2A',
          active: '#333333',
        },
        primary: '#E0E0E0',
        secondary: '#888888',
        tertiary: '#555555',
        accent: {
          blue: '#4C82FB',
          'blue-muted': 'rgba(76,130,251,0.08)',
          green: '#40B66B',
          'green-muted': 'rgba(64,182,107,0.08)',
          red: '#FF5F52',
          'red-muted': 'rgba(255,95,82,0.08)',
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
