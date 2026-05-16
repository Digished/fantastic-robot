import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF6EE",
        terracotta: {
          DEFAULT: "#D9613C",
          50: "#FBEFE9",
          100: "#F6DACE",
          500: "#D9613C",
          600: "#BF4F2D",
          700: "#9A3F24",
        },
        plum: {
          DEFAULT: "#3B1F2B",
          900: "#3B1F2B",
        },
        gold: { DEFAULT: "#E8B84B" },
        ink: "#1F1A18",
        muted: "#7A6E68",
      },
      fontFamily: {
        serif: ["var(--font-instrument-serif)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,26,24,0.06), 0 8px 24px rgba(31,26,24,0.06)",
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
