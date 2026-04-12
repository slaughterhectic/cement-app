/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EDEDFE',
          100: '#DDDEFF',
          200: '#BBBDFD',
          300: '#9A9DF9',
          400: '#7E80F6',
          500: '#6B6CF2',
          600: '#5557D4',
          700: '#4344B0',
          800: '#33348C',
          900: '#242568',
        },
        purchase: '#1E6FC0',
        sale: '#2D7A1F',
        outstanding: '#C0271E',
        'stock-warn': '#B8620A',
        profit: '#0F7A4B',
        surface: '#F8F7F4',
        'card-border': '#E5E4DF',
        heading: '#1A1A2E',
      },
    },
  },
  plugins: [],
};
