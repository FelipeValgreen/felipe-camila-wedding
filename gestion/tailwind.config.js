/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FAF8F3',
        'cream-dark': '#F1EEE7',
        dark: '#11110F',
        muted: '#777168',
        gold: '#B79A68',
        'status-confirmed': '#2D5A27',
        'status-pending': '#8E703E',
        'status-declined': '#55504A',
        'status-error': '#A83232',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
