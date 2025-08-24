/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme foundation - AIDEV-NOTE: Base dark colors for the app background
        background: {
          primary: '#0a0a0b',
          secondary: '#131316',
          tertiary: '#1a1a1f',
          elevated: '#1f1f25',
        },
        // Surface colors for cards and panels
        surface: {
          DEFAULT: '#1a1a1f',
          elevated: '#1f1f25',
          hover: '#252530',
        },
        // Border colors
        border: {
          subtle: '#2a2a32',
          DEFAULT: '#3a3a44',
          strong: '#4a4a55',
        },
        // Brand colors from Mandrake Bio logo - AIDEV-NOTE: Teal color extracted from logo
        brand: {
          50: '#e6f7f9',
          100: '#b3e5ed',
          200: '#80d3e1',
          300: '#4dc1d5',
          400: '#26b5cc',
          500: '#00a9c3', // Primary brand color (matches logo)
          600: '#0095ad',
          700: '#007e92',
          800: '#006777',
          900: '#00505c',
        },
        // Scientific accent colors
        accent: {
          primary: '#00d4ff', // Bright cyan for primary actions
          secondary: '#7c3aed', // Purple for AI interactions
          success: '#10b981', // Green for confirmations
          warning: '#f59e0b', // Amber for cautions
          error: '#ef4444', // Red for errors
          info: '#3b82f6', // Blue for information
        },
        // Text hierarchy
        text: {
          primary: '#ffffff',
          secondary: '#a8a8b3',
          tertiary: '#6a6a75',
          muted: '#4a4a55',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 255, 0.1)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}