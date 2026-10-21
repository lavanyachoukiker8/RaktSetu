/** RaktSetu: red-only palette. Every other hue is deliberately removed from the theme. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      red: {
        50: '#FFF1F2',
        100: '#FFE0E3',
        200: '#FFC2C8',
        300: '#FF97A1',
        400: '#F26471',
        500: '#E63946',
        600: '#D62839',
        700: '#B71C2C',
        800: '#8E1422',
        900: '#6B0F1A',
        950: '#3D0810',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(214, 40, 57, 0.28)',
        lift: '0 18px 40px -12px rgba(183, 28, 44, 0.35)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(183, 28, 44, 0.55)' },
          '50%': { boxShadow: '0 0 0 7px rgba(183, 28, 44, 0)' },
        },
        'fade-in': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'none' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
        'fade-in': 'fade-in .35s ease-out both',
        pop: 'pop .2s ease-out both',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};
