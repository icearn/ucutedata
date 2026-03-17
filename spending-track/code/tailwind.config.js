/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-dark': '#4f46e5',
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#0f172a',
        'text-secondary': '#64748b',
        border: '#e2e8f0',
        food: '#f59e0b',
        transport: '#3b82f6',
        health: '#10b981',
        entertainment: '#ec4899',
        shopping: '#8b5cf6',
        utilities: '#06b6d4',
        other: '#6b7280',
      }
    },
  },
  presets: [require("nativewind/preset")],
  plugins: [],
}
