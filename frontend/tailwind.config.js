/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        celo: {
          green: "#35D07F",
          dark: "#1E7A4D",
          light: "#E8FAF0",
          gold: "#FBCC5C",
        },
      },
    },
  },
  plugins: [],
};
