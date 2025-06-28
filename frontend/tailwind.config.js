/** @type {import('tailwindcss').Config} */
export default {
  content:
    [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}"
    ],

  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
      lobster: ['Lobster', 'cursive'],
      vibes: ['Great Vibes', 'cursive'],
    },
  },
  plugins: [],
}
}
