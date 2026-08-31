/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F172A', // Slate Deep
        'primary-hover': '#1E293B',
        brand: '#10B981', // Electric Emerald Accent
        'brand-dark': '#059669',
        accent: '#06B6D4', // Cyan accent
        'surface-pressed': '#e2e8f0',
        'black-elevated': '#1E293B',
        canvas: '#ffffff',
        'canvas-soft': '#F8FAFC',
        'canvas-softer': '#F1F5F9',
        ink: '#0F172A',
        body: '#64748B',
        'hairline-mid': '#475569',
        mute: '#94A3B8',
        'on-dark': '#ffffff',
        link: '#2563EB',
      },
      fontFamily: {
        display: ['Gentona-Regular', 'Gentona', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        text: ['Gentona-Regular', 'Gentona', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display-xxl': ['52px', { lineHeight: '64px', fontWeight: '700' }],
        'display-xl': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'display-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'display-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'display-sm': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '24px', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md-strong': ['16px', { lineHeight: '20px', fontWeight: '600' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm-strong': ['14px', { lineHeight: '16px', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '20px', fontWeight: '500' }],
      },
      borderRadius: {
        none: '0px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        pill: '9999px',
        'pill-tab': '16px',
        full: '9999px',
      },
      boxShadow: {
        subtle: '0px 4px 20px 0px rgba(0, 0, 0, 0.06)',
        card: '0px 10px 30px -5px rgba(15, 23, 42, 0.12)',
        glow: '0px 4px 20px 0px rgba(16, 185, 129, 0.3)',
        'pill-float': '0px 4px 12px 0px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
