/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effdf8',
          100: '#d8f8ec',
          200: '#b4f1db',
          300: '#7de6c0',
          400: '#3dd39a',
          500: '#17b87d',
          600: '#0d9f6a',
          700: '#0e7d56',
          800: '#116446',
          900: '#115238'
        }
      },
      boxShadow: {
        panel: '0 20px 45px -24px rgba(15, 23, 42, 0.45)'
      }
    }
  },
  plugins: []
};
