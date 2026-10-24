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
        // Primary Brand Palette: Olive & Linen & Honey & Ink
        olive: {
          deep: "#48563A",
          soft: "#A9B392",
          dark: "#3a462e",
          50: "#f7f8f4",
          100: "#edf1e8",
          200: "#dbe3d3",
          300: "#c2d0b7",
          400: "#A9B392", // Soft Olive
          500: "#6e825a",
          600: "#48563A", // Deep Olive
          700: "#3a462e",
          800: "#2e3825",
          900: "#2D3327", // Ink
        },
        linen: {
          DEFAULT: "#F7F4EA",
          50: "#fcfbf8",
          100: "#FAF8F2",
          200: "#F7F4EA", // Linen canvas
          300: "#ede7d6",
          400: "#ded7c0",
          500: "#c8be9f",
        },
        honey: {
          DEFAULT: "#D6B46D",
          50: "#fbf8f0",
          100: "#f6eed9",
          200: "#eedbb2",
          300: "#e3c68a",
          400: "#D6B46D", // Honey Accent
          500: "#be974f",
          600: "#9e7737",
        },
        ink: {
          DEFAULT: "#2D3327",
          50: "#f5f6f4",
          100: "#e6e8e4",
          200: "#c8ccc4",
          300: "#a3aaa0",
          400: "#798375",
          500: "#596455",
          600: "#454f41",
          700: "#363f33",
          800: "#2D3327", // Ink
          900: "#20251c",
        },
        // Dairy Scale aliased to Deep & Soft Olive
        dairy: {
          50: "#f7f8f4",
          100: "#edf1e8",
          200: "#dbe3d3",
          300: "#A9B392", // Soft Olive
          400: "#7b8f68",
          500: "#5a6d49",
          600: "#48563A", // Deep Olive
          700: "#3a462e",
          800: "#2e3825",
          900: "#2D3327", // Ink
        },
        rc: {
          periwinkle: "#48563A", // Deep Olive as primary action
          "deep-indigo": "#2D3327", // Ink as primary text
          "storm-violet": "#454f41",
          slate: "#596455",
          fog: "#798375",
          ash: "#8c9781",
          "midnight-ink": "#2D3327",
          cloud: "#F7F4EA", // Linen canvas
          paper: "#ffffff",
          mist: "#dedbc9", // Linen border
          haze: "#A9B392", // Soft Olive
          bone: "#e5e1d3",
          "lilac-wash": "#edf1e8",
          "periwinkle-mist": "#dbe3d3",
          "sky-tint": "#A9B392",
          "coral-ember": "#c85246",
          "coral-blush": "#fae3e1",
          "mint-whisper": "#A9B392",
          "mint-veil": "#dbe3d3",
        },
        kenya: {
          green: "#48563A",
          red: "#990000",
          black: "#2D3327",
        }
      },
      boxShadow: {
        "rc-md": "rgba(45, 51, 39, 0.08) 0px 4px 16px 0px",
        "rc-lg": "rgba(45, 51, 39, 0.12) 0px 6px 24px 0px, rgba(72, 86, 58, 0.08) 0px 30px 60px 0px",
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
