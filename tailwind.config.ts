import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // RevenueCat Design System Tokens
        rc: {
          periwinkle: "#576cdb",
          "deep-indigo": "#1f1f47",
          "storm-violet": "#3d3d5c",
          slate: "#575775",
          fog: "#6c7693",
          ash: "#84849a",
          "midnight-ink": "#171a1c",
          cloud: "#f9f9fb",
          paper: "#ffffff",
          mist: "#eaedf6",
          haze: "#d1d6e1",
          bone: "#e3e6e8",
          "lilac-wash": "#d6dbf5",
          "periwinkle-mist": "#c1c9f6",
          "sky-tint": "#abb6ed",
          "coral-ember": "#f25a5a",
          "coral-blush": "#f7d4d4",
          "mint-whisper": "#a6f2d2",
          "mint-veil": "#c1f6e0",
        },
        dairy: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        kenya: {
          green: "#006600",
          red: "#990000",
          black: "#000000",
        }
      },
      boxShadow: {
        "rc-md": "rgba(73, 46, 107, 0.14) 0px 3px 16px 0px",
        "rc-lg": "rgba(71, 92, 133, 0.25) 0px 4px 20px 0px, rgba(144, 138, 208, 0.1) 0px 30px 60px 0px",
      },
      letterSpacing: {
        "tightest-rc": "-0.07em",
        "tighter-rc": "-0.04em",
        "tight-rc": "-0.03em",
      },
      borderRadius: {
        "card": "16px",
        "panel": "32px",
      }
    },
  },
  plugins: [],
};
export default config;
