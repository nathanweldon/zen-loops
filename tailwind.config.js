/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f172a",
        surface: "#111827",
        primary: "#34d399",
        accent: "#f59e0b",
        success: "#a7f3d0",
      },
      borderRadius: { xl: "20px", "2xl": "28px" },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,0.25)" },
    },
  },
  plugins: [],
};
