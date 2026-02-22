/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SleepCore brand colors
        primary: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
        // Night theme colors
        night: {
          50: '#e8e8f0',
          100: '#c5c5d8',
          200: '#9f9fbe',
          300: '#7979a4',
          400: '#5c5c91',
          500: '#3f3f7e',
          600: '#393976',
          700: '#31316b',
          800: '#292961',
          900: '#1b1b4e',
        },
        // Accent colors
        accent: {
          mint: '#63e6be',
          lavender: '#d0bfff',
          peach: '#ffd8a8',
          sky: '#74c0fc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'breathe-in': 'breatheIn 4s ease-in-out',
        'breathe-out': 'breatheOut 4s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        breatheIn: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.3)' },
        },
        breatheOut: {
          '0%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
