/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Wise Signature Palette
        primary: '#9fe870', // Wise Lime-Green CTA
        'primary-active': '#cdffad',
        'primary-neutral': '#c5edab',
        'primary-pale': '#e2f6d5',
        'on-primary': '#0e0f0c',

        canvas: '#ffffff', // Pure white card surface
        'canvas-soft': '#e8ebe6', // Sage-tinted page surface

        ink: '#0e0f0c', // Near-black with olive warmth
        'ink-deep': '#163300',
        body: '#454745',
        mute: '#868685',

        // Semantic palette
        positive: '#2ead4b',
        'positive-deep': '#054d28',
        warning: '#ffd11a',
        'warning-deep': '#b86700',
        'warning-content': '#4a3b1c',
        negative: '#d03238',
        'negative-deep': '#a72027',
        'negative-darkest': '#a7000d',
        'negative-bg': '#320707',

        // Tertiary illustrative accents
        'accent-orange': '#ffc091',
        'accent-cyan': '#38c8ff',
      },
      fontFamily: {
        display: ['Inter', 'Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        text: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display-mega': ['126px', { lineHeight: '107px', fontWeight: '900' }],
        'display-xxl': ['96px', { lineHeight: '82px', fontWeight: '900' }],
        'display-xl': ['64px', { lineHeight: '55px', fontWeight: '900' }],
        'display-lg': ['47px', { lineHeight: '70px', fontWeight: '400' }],
        'display-md': ['40px', { lineHeight: '42px', fontWeight: '900' }],
        'display-sm': ['32px', { lineHeight: '38px', fontWeight: '600' }],
        'display-xs': ['24px', { lineHeight: '31px', fontWeight: '600' }],
        'body-lg': ['20px', { lineHeight: '30px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md-strong': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm-strong': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      borderRadius: {
        none: '0px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px', // Canonical Wise Card & Button Radius (24px)
        pill: '9999px',
        full: '9999px',
      },
      boxShadow: {
        subtle: '0px 2px 12px 0px rgba(14, 15, 12, 0.04)',
        card: '0px 8px 30px 0px rgba(14, 15, 12, 0.08)',
        glow: '0px 4px 20px 0px rgba(159, 232, 112, 0.4)',
        'pill-float': '0px 4px 16px 0px rgba(14, 15, 12, 0.1)',
      },
    },
  },
  plugins: [],
};
