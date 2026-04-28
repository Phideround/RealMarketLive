import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#000000",
          text: "#00FF41",
          muted: "#666666",
          accent: "#00E5FF",
          positive: "#00FF41",
          negative: "#FFB100",
          neutral: "#000000",
        },
      },
      fontFamily: {
        mono: [
          '"JetBrains Mono"',
          '"Monaco"',
          '"Courier New"',
          "monospace",
        ],
      },
      animation: {
        glow: "glow 2s ease-in-out infinite",
        flicker: "flicker 0.15s infinite",
        scanlines: "scanlines 8s linear infinite",
      },
      keyframes: {
        glow: {
          "0%, 100%": { textShadow: "0 0 10px #00FF41" },
          "50%": { textShadow: "0 0 20px #00FF41, 0 0 30px #00FF41" },
        },
        flicker: {
          "0%, 18%, 22%, 25%, 54%, 56%, 100%": { opacity: "1" },
          "19%, 24%, 55%": { opacity: "0.4" },
        },
        scanlines: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
