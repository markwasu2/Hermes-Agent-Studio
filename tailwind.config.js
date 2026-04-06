/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'IBM Plex Sans'", "sans-serif"],
        display: ["'Space Grotesk'", "sans-serif"],
      },
      colors: {
        surface: {
          0: "#080a0d",
          1: "#0d1017",
          2: "#121620",
          3: "#181e2a",
          4: "#1f2636",
        },
        amber: {
          dim: "#7a5200",
          mid: "#c87d00",
          DEFAULT: "#f0a500",
          bright: "#ffc840",
          glow: "#ffe066",
        },
        jade: {
          DEFAULT: "#00d97e",
          dim: "#00804a",
        },
        rose: {
          DEFAULT: "#ff4d6d",
          dim: "#8b1a2e",
        },
        sky: {
          DEFAULT: "#38bdf8",
          dim: "#0a4d6b",
        },
        border: "#1f2a3a",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        blink: "blink 1.2s step-end infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
      },
    },
  },
  plugins: [],
};
