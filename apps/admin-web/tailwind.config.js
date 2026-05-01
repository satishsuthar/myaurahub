/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201c",
        moss: "#45624f",
        mint: "#d7f3df",
        coral: "#f26d5b",
        paper: "#fbfaf7"
      }
    }
  },
  plugins: []
};
