/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-roboto)', 'Roboto', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'Outfit', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        hero: "url('/assets/background.png')",
      },
      borderWidth: {
        1: '1px',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        button: 'var(--radius-button)',
        input: 'var(--radius-input)',
        badge: 'var(--radius-badge)',
        lg: 'var(--radius-card)',
        md: 'var(--radius-button)',
        sm: 'var(--radius-input)',
      },
      colors: {
        'hero-orange': {
          DEFAULT: 'var(--hero-orange)',
          hover: 'var(--hero-orange-hover)',
          light: 'var(--hero-orange-light)',
        },
        'deep-navy': {
          DEFAULT: 'var(--deep-navy)',
          hover: 'var(--deep-navy-hover)',
          light: 'var(--deep-navy-light)',
        },
        'responsible-green': {
          DEFAULT: 'var(--responsible-green)',
          light: 'var(--responsible-green-light)',
        },
        'warm-yellow': {
          DEFAULT: 'var(--warm-yellow)',
          light: 'var(--warm-yellow-light)',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          light: 'var(--success-light)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          light: 'var(--warning-light)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
      },
      fontSize: {
        'section-title': ['2rem', { lineHeight: '1.25' }],
        subsection: ['1.5rem', { lineHeight: '1.3' }],
        body: ['1rem', { lineHeight: '1.5' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.5' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
