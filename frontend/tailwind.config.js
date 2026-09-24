/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030712',
          900: '#0B0F19',
          850: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        satellite: {
          cyan: '#38BDF8',
          blue: '#0284C7',
          emerald: '#10B981',
          amber: '#F59E0B',
          crimson: '#EF4444',
          indigo: '#6366F1',
          purple: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace']
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite'
      }
    },
  },
  plugins: [],
}
