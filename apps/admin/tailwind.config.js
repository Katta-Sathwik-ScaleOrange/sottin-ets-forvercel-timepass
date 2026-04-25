export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a', 900: '#14532d' },
        surface: { 0: '#0a0a0f', 1: '#111118', 2: '#1a1a24', 3: '#24243a', border: '#2e2e45' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
