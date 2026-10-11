/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        civic: {
          roads: '#f59e0b',
          water: '#0ea5e9',
          electricity: '#eab308',
          waste: '#10b981',
          parks: '#22c55e',
          safety: '#ef4444',
          construction: '#8b5cf6',
        }
      }
    },
  },
  plugins: [],
}
