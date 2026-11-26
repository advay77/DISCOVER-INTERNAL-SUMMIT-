import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

/**
 * DISCOVER OS design tokens.
 *
 * Register: a calm operations desk. Warm grey canvas, white rounded panels,
 * near-black for primary actions and the active nav item, and one lime accent
 * reserved for the single figure or card that should catch the eye.
 *
 * The `navy` scale keeps its name so every existing `bg-navy` / `text-navy`
 * across the app follows the new ink colour without a rename.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Every colour reads a CSS variable (RGB channels) set in globals.css,
      // so `.dark` on <html> re-themes the whole app. `white` is the surface
      // colour (cards, panels) and `navy` is the high-contrast colour (primary
      // buttons, active nav) — they swap in dark mode. `snow` stays white in
      // both themes, for text on coloured badges and avatars.
      colors: {
        white: v('surface'),
        snow: '#FFFFFF',
        navy: {
          DEFAULT: v('navy'),
          900: v('navy-900'),
          800: v('navy'),
          700: v('navy-700'),
          600: v('navy-600'),
        },
        lime: {
          DEFAULT: '#E3F24A',
          600: '#CFE02F',
          100: v('lime-100'),
          ink: '#2A2E05',
        },
        brand: {
          DEFAULT: v('brand'),
          600: v('brand-600'),
          500: v('brand-500'),
          100: v('brand-100'),
          50: v('brand-50'),
        },
        brass: { DEFAULT: v('brass'), 100: v('brass-100') },
        forest: { DEFAULT: v('forest'), 100: v('forest-100') },
        brick: { DEFAULT: v('brick'), 100: v('brick-100') },
        ink: {
          DEFAULT: v('ink'),
          muted: v('ink-muted'),
          faint: v('ink-faint'),
        },
        line: v('line'),
        'line-strong': v('line-strong'),
        paper: v('paper'),
        panel: v('panel'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        tile: '16px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: '0 16px 40px rgba(20,20,20,0.14)',
      },
      fontSize: {
        '2xs': ['10.5px', '14px'],
      },
      letterSpacing: {
        label: '0.04em',
      },
    },
  },
  plugins: [],
};

export default config;
