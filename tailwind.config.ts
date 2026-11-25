import type { Config } from 'tailwindcss';

/**
 * DISCOVER OS design tokens.
 *
 * Register: a printed annual report, not a SaaS dashboard. Hairlines carry
 * structure instead of drop shadows; brass is reserved for things that need
 * a person's attention; type does the hierarchy.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A2240',
          900: '#061728',
          800: '#0A2240',
          700: '#143258',
          600: '#1F4874',
        },
        brand: {
          DEFAULT: '#1F5FA8',
          600: '#1A5192',
          500: '#2F72BF',
          100: '#E4EDF7',
          50: '#F1F6FB',
        },
        brass: {
          DEFAULT: '#B4761F',
          100: '#F6EDDD',
        },
        forest: { DEFAULT: '#1E7A4B', 100: '#E3F0E9' },
        brick: { DEFAULT: '#A62B2B', 100: '#F6E6E6' },
        ink: {
          DEFAULT: '#1A1F26',
          muted: '#5C6672',
          faint: '#8A93A0',
        },
        line: '#E0E1DD',
        'line-strong': '#C9CBC5',
        paper: '#F7F7F5',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '6px',
      },
      boxShadow: {
        card: 'none',
        pop: '0 12px 32px rgba(10,34,64,0.14)',
      },
      fontSize: {
        '2xs': ['10.5px', '14px'],
      },
      letterSpacing: {
        label: '0.08em',
      },
    },
  },
  plugins: [],
};

export default config;
