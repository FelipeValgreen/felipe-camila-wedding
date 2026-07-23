/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './galeria/**/*.html',
    './fotos/**/*.html',
    './js/**/*.js'
  ],
  safelist: [
    'bg-[#5C1D24]',
    'bg-[#C5A059]',
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
        dark: '#0F0C0B',
        cream: '#F3EFE7',
        light: '#FAF8F3',
        muted: '#918D85',
        wine: '#5C1D24',
        gold: '#C5A059',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'sans-serif'],
      }
    }
  },
  plugins: []
};
