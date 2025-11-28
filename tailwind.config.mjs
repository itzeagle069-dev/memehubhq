/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // This specific line finds all your files
  ],
  theme: {
    extend: {
      colors: {
        // We can add custom colors later if needed
      }
    },
  },
  plugins: [],
};