/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './galeria/**/*.html',
    './js/**/*.js',
    './fotos/**/*.html'
  ],
  safelist: [
    'bg-red-700',
    'bg-dark',
    'bg-[#25D366]',
    'bg-[#20ba5a]',
    'opacity-0',
    'opacity-100',
    'translate-y-0',
    '-translate-y-full',
    'hidden',
    'locked',
    'rail-item',
    'rail-container',
    'rail-wrapper'
  ],
  theme: {
    extend: {
      colors: {
        dark: '#11110F',
        cream: '#F3EFE7',
        light: '#FAF8F3',
        muted: '#918D85',
        wine: '#4A222A',
        gold: '#B99B71',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'sans-serif'],
      }
    }
  },
  plugins: []
};
