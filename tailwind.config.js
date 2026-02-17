/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
        },
        surface: {
          bg: 'var(--surface-bg)',
          card: 'var(--surface-card)',
          border: 'var(--surface-border)',
          text: 'var(--surface-text)',
          soft: 'var(--surface-soft-text)',
          muted: 'var(--surface-muted)',
        },
      },
    },
  },
  plugins: [],
};
