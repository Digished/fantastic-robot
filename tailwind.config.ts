import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F0E0D",
        muted: "#7A6E68",
        cream: "#FBF6EE",
        terracotta: {
          DEFAULT: "#C2410C",
          50: "#FFF1EA",
          100: "#FCDDCC",
          500: "#C2410C",
          600: "#9C320A",
          700: "#7C2807",
        },
        plum: { DEFAULT: "#1F1A1F", 900: "#0F0E0D" },
        gold: { DEFAULT: "#B5894A" },
        accent: "var(--accent)",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        sans:  ["var(--font-geist)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,14,13,0.04), 0 12px 30px rgba(15,14,13,0.08)",
        soft: "0 1px 2px rgba(15,14,13,0.04), 0 4px 14px rgba(15,14,13,0.06)",
        glow: "0 0 0 1px rgba(255,255,255,0.6), 0 18px 44px -10px var(--accent-glow,rgba(194,65,12,0.45))",
        ring: "0 0 0 1px rgba(15,14,13,0.08)",
      },
      borderRadius: { xl2: "1.1rem", "3xl2": "1.6rem", "4xl": "2rem" },
      maxWidth: { phone: "28rem" },
    },
  },
  plugins: [],
};

export default config;
