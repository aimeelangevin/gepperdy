import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Jeopardy color palette
        jeopardy: {
          blue: {
            DEFAULT: "#060CE9", // Deep Jeopardy blue
            light: "#2138E8",
            dark: "#040A99",
          },
          royal: {
            DEFAULT: "#0033A0", // Royal blue
            light: "#0047D0",
            dark: "#002570",
          },
          magenta: {
            DEFAULT: "#D4145A", // Jeopardy pink/magenta
            light: "#E6458E",
            dark: "#A00F45",
          },
          gold: {
            DEFAULT: "#FFCC00", // Jeopardy gold
            light: "#FFD93D",
            dark: "#CCA300",
          },
          silver: {
            DEFAULT: "#C0C0C0", // Jeopardy silver
            light: "#E8E8E8",
            dark: "#8C8C8C",
          },
        },
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        jeopardy: ["var(--font-jeopardy)", "Georgia", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
