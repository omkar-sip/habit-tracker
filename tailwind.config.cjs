/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0c10',
        panel: '#12141b',
        violet: '#9b7dff',
        lime: '#b7f36b',
        smoke: '#9a9eab'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(155,125,255,.16), 0 18px 60px rgba(0,0,0,.28)',
        lime: '0 0 0 1px rgba(183,243,107,.28), 0 10px 34px rgba(183,243,107,.12)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
