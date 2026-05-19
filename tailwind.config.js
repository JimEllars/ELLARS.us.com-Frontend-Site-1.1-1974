/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#0A0A0A',
        purple: { neon: '#a855f7', deep: '#4c1d95' },
        yellow: { electric: '#fde047' },
        panel: '#0a0a0a',
        surface: '#121212',
        phthalo: {
          deep: '#001a13',
          base: '#004a3f',
          glow: '#008f7a',
        },
        gold: {
          dim: '#8a6e2f',
          base: '#c5a059',
          bright: '#ffd700',
        },
        text: {
          main: '#e2e8f0',
          muted: '#94a3b8',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        editorial: ['Cinzel', 'serif'],
        deco: ['Marcellus', 'serif'], // Primary Art Deco Token
        mono: ['VT323', 'monospace'],
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}