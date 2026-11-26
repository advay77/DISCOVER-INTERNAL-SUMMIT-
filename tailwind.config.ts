import type { Config } from 'tailwindcss';

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
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#151515',
          900: '#0F0F0F',
          800: '#151515',
          700: '#2B2B2B',
          600: '#3D3D3D',
        },
        lime: {
          DEFAULT: '#E3F24A',
          600: '#CFE02F',
          100: '#F4F9C8',
          ink: '#2A2E05',
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
          DEFAULT: '#151515',
          muted: '#5E5E5A',
          faint: '#8F8F89',
        },
        line: '#E7E5DF',
        'line-strong': '#D3D0C8',
        paper: '#EEEDE8',
        panel: '#F5F4F0',
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
        card: '0 1px 2px rgba(20,20,20,0.04)',
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
