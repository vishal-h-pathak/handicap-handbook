import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F1EA',
        surface: '#FFFFFF',
        ink: '#1F1A14',
        forest: '#0E4D3F',
        brass: '#B7872F',
        muted: '#8B8275',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['4rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        h1: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        h2: ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        h3: ['1.25rem', { lineHeight: '1.3' }],
        body: ['1rem', { lineHeight: '1.6' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        huge: ['12rem', { lineHeight: '0.9', letterSpacing: '-0.04em' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        card: '8px',
        chip: '999px',
      },
      boxShadow: {
        card: '0 2px 24px rgba(0,0,0,0.06)',
        lift: '0 8px 40px rgba(0,0,0,0.08)',
      },
      maxWidth: {
        prose: '36rem',
        wide: '52rem',
      },
    },
  },
  plugins: [],
};

export default config;
