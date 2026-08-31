/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'surface-pressed': '#e2e2e2',
        'black-elevated': '#282828',
        canvas: '#ffffff',
        'canvas-soft': '#efefef',
        'canvas-softer': '#f3f3f3',
        ink: '#000000',
        body: '#5e5e5e',
        'hairline-mid': '#4b4b4b',
        mute: '#afafaf',
        'on-dark': '#ffffff',
        link: '#0000ee',
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        text: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display-xxl': ['52px', { lineHeight: '64px', fontWeight: '700' }],
        'display-xl': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'display-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'display-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'display-sm': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '24px', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md-strong': ['16px', { lineHeight: '20px', fontWeight: '500' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm-strong': ['14px', { lineHeight: '16px', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '20px', fontWeight: '400' }],
      },
      borderRadius: {
        none: '0px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '999px',
        'pill-tab': '36px',
        full: '9999px',
      },
      boxShadow: {
        subtle: '0px 4px 16px 0px rgba(0, 0, 0, 0.12)',
        card: '0px 4px 16px 0px rgba(0, 0, 0, 0.16)',
        'pill-float': '0px 2px 8px 0px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
};
