/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lab-bg': '#f5f0e8',
        'lab-surface': '#ffffff',
        'lab-border': '#e2e8f0',
        'lab-accent': '#22c55e',
        'lab-text': '#1e293b',
        'lab-text-dim': '#64748b',
        // Brand palette
        'brand': {
          primary: '#1FA971',
          dark:    '#157A55',
          light:   '#E8F5F0',
          bg:      '#F5F7F6',
          sidebar: '#F0F4F2',
        },
      },
      fontFamily: {
        mono: ['Roboto', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}