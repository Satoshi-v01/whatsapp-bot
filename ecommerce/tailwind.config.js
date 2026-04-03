/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#ffa601',
          dark:    '#e08900',
          darker:  '#c07600',
          light:   '#fff3d6',
          glow:    'rgba(255,166,1,0.25)',
        },
        secondary: {
          DEFAULT: '#1a1208',
          light:   '#8b6f47',
          faint:   '#c4a882',
        },
        brand: {
          bg:       '#fffbf4',
          elevated: '#fff8ee',
          card:     'rgba(255,255,255,0.92)',
          text:     '#1a1208',
          muted:    '#8b6f47',
          faint:    '#c4a882',
          border:   'rgba(255,166,1,0.18)',
        },
      },
      borderRadius: {
        DEFAULT: '20px',
        sm:  '10px',
        md:  '14px',
        lg:  '20px',
        xl:  '26px',
        '2xl': '32px',
        pill: '50px',
      },
      boxShadow: {
        sm:         '0 4px 28px rgba(26,18,8,0.07)',
        md:         '0 8px 36px rgba(26,18,8,0.10)',
        lg:         '0 12px 48px rgba(26,18,8,0.13)',
        'card-hover': '0 10px 48px rgba(26,18,8,0.12)',
        nav:        '0 4px 20px rgba(0,0,0,0.06)',
        brand:      '0 6px 24px rgba(255,166,1,0.35)',
      },
      animation: {
        float:        'float 8s ease-in-out infinite',
        'fade-in':    'fade-in 0.5s ease-out forwards',
        'slide-up':   'slide-up 0.5s ease-out forwards',
        'fade-up':    'fadeUp 0.6s ease both',
        'dot-pulse':  'dotPulse 1.6s ease infinite',
        'bar-shine':  'barShine 2.2s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        dotPulse: {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(0.6)', opacity: '0.45' },
        },
        barShine: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
    },
  },
  plugins: [],
}
