/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system colours — mirrors CSS custom properties in globals.css
        "bg-base":    "#0f172a",
        "bg-card":    "#1e293b",
        "bg-sidebar": "#0d1526",
        accent:       "#6366f1",
        "call-active":   "#22c55e",
        "call-incoming": "#facc15",
        "call-missed":   "#ef4444",
        "call-hold":     "#6366f1",
      },
    },
  },
  plugins: [],
};
