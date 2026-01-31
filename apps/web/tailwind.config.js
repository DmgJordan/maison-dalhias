/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF385C',
        secondary: '#E9C46A',
        dark: '#222222',
        accent: '#E76F51',
        background: '#F7F7F7',
        text: '#484848',
      },
      fontFamily: {
        sans: [
          'Circular',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      boxShadow: {
        custom: '0 6px 16px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
