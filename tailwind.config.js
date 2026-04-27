/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#050505',
        purple: { neon: '#a855f7', deep: '#4c1d95' },
        yellow: { electric: '#fbbf24' },
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
        editorial: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}