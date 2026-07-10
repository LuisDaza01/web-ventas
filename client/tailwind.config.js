/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sistema editorial minimalista: papel, tinta y un solo acento.
        paper: '#FAFAF8',
        ink: '#0A0A0A',
        gris: '#6B6B6B',
        line: '#E5E5E1',
        accent: '#C1440E',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        micro: '0.15em',
      },
    },
  },
  plugins: [],
};
