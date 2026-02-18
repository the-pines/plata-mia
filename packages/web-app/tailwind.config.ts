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
          DEFAULT: '#FDE047',
          dark: '#EAB308',
          muted: 'rgba(253,224,71,0.13)',
        },
        surface: {
          DEFAULT: '#1B1B1B',
          hover: '#252525',
        },
        module: '#252525',
        border: {
          DEFAULT: '#2A2A2A',
        },
        secondary: '#9B9B9B',
        tertiary: '#5E5E5E',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
