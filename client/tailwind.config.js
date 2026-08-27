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
        twitter: {
          blue: '#1d9bf0',
          hover: '#1a8cd8',
          dark: '#000000',
          card: '#16181c',
          border: '#2f3336',
          muted: '#71767b',
          accent: '#00ba7c',
          danger: '#f4212e',
          warning: '#ffd400',
          purple: '#7856ff'
        }
      }
    },
  },
  plugins: [],
}
