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
        // Sage & Ivory Design System Tokens
        sage: {
          DEFAULT: "#345C4A",
          deep: "#345C4A",
          soft: "#A8BFA5",
          hover: "#274537",
          50: "#f3f7f4",
          100: "#e4ede7",
          200: "#cbdbcf",
          300: "#A8BFA5", // Soft Sage
          400: "#789c83",
          500: "#4f7863",
          600: "#345C4A", // Deep Sage
          700: "#274537",
          800: "#1d3329",
          900: "#15241d",
          950: "#0e1813",
        },
        ivory: {
          DEFAULT: "#FAF9F5", // Warm Ivory
          surface: "#FFFFFF",
          muted: "#F2EFE7",
          border: "#E8E4D8",
          50: "#fdfdfb",
          100: "#FAF9F5",
          200: "#F2EFE7",
          300: "#E8E4D8",
          400: "#d9d2c2",
          500: "#c4bba7",
        },
        gold: {
          DEFAULT: "#C6A76A", // Muted Gold
          hover: "#b39252",
          subtle: "#FAF5EB",
          border: "#E5D5B5",
          50: "#fbf9f4",
          100: "#FAF5EB",
          200: "#ebd8b0",
          300: "#d8be85",
          400: "#C6A76A",
          500: "#b39252",
          600: "#8e7238",
        },
        charcoal: {
          DEFAULT: "#26332D", // Charcoal
          light: "#3D4F46",
          muted: "#5D7368",
          subtle: "#879C91",
          50: "#f4f6f5",
          100: "#e5eae7",
          200: "#c7d2cd",
          300: "#9fb1a9",
          400: "#6f877d",
          500: "#4b6158",
          600: "#3D4F46",
          700: "#2d3b35",
          800: "#26332D",
          900: "#1b2520",
          950: "#121915",
        },
        // Dairy Scale aliased to Sage & Ivory
        dairy: {
          50: "#f3f7f4",
          100: "#e4ede7",
          200: "#cbdbcf",
          300: "#A8BFA5", // Soft Sage
          400: "#789c83",
          500: "#4f7863",
          600: "#345C4A", // Deep Sage
          700: "#274537",
          800: "#1d3329",
          900: "#26332D", // Charcoal
          950: "#121915",
        },
        rc: {
          periwinkle: "#345C4A", // Deep Sage
          "deep-indigo": "#26332D", // Charcoal
          "storm-violet": "#3D4F46",
          slate: "#4b6158",
          fog: "#5D7368",
          ash: "#879C91",
          "midnight-ink": "#26332D",
          cloud: "#FAF9F5", // Warm Ivory
          paper: "#ffffff",
          mist: "#E8E4D8", // Warm Ivory border
          haze: "#A8BFA5", // Soft Sage
          bone: "#e4ede7",
          "lilac-wash": "#e4ede7",
          "periwinkle-mist": "#cbdbcf",
          "sky-tint": "#A8BFA5",
          "coral-ember": "#B94A48",
          "coral-blush": "#FDF2F2",
          "mint-whisper": "#A8BFA5",
          "mint-veil": "#cbdbcf",
        },
        kenya: {
          green: "#345C4A",
          red: "#990000",
          black: "#26332D",
        }
      },
      boxShadow: {
        "rc-md": "rgba(38, 51, 45, 0.06) 0px 4px 18px 0px",
        "rc-lg": "rgba(38, 51, 45, 0.08) 0px 8px 30px 0px, rgba(52, 92, 74, 0.05) 0px 20px 40px 0px",
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
