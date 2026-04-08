/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF4ED',
          100: '#FFE6D5',
          200: '#FECCAA',
          300: '#FDAB74',
          400: '#FB8A3C',
          500: '#E8580A',
          600: '#D04A08',
          700: '#AC3B09',
          800: '#89310F',
          900: '#6F2A10',
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
