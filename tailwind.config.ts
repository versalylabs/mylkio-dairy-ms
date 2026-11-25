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
        // The website's ledger palette: a deep forest for dark bands, a cool milk-white page,
        // the yellow of a co-op delivery slip (used sparingly), and the hairline that replaces shadows.
        forest: { DEFAULT: "#14291F", soft: "#1E3A2D" },
        milk: "#F8F8F3",
        chit: { DEFAULT: "#F4DC7A", deep: "#E9C94F" },
        rule: "#DDE2D6",
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
        // The app screens were written with Tailwind's cold grey and slate. Remapping both scales to the
        // warm ivory / charcoal family makes every screen match the website without editing each class.
        gray: {
          50: "#fbfaf6",
          100: "#f4f1e9",
          200: "#e8e4d8",
          300: "#d9d2c2",
          400: "#7a9086",
          500: "#5D7368",
          600: "#4b6158",
          700: "#3D4F46",
          800: "#2d3b35",
          900: "#26332D",
          950: "#121915",
        },
        slate: {
          50: "#fbfaf6",
          100: "#f4f1e9",
          200: "#e8e4d8",
          300: "#d9d2c2",
          400: "#7a9086",
          500: "#5D7368",
          600: "#4b6158",
          700: "#3D4F46",
          800: "#2d3b35",
          900: "#26332D",
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
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        // Headlines use the same Versaly face as the body (Quicksand), set heavier and tighter.
        display: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      // Fluid type: headings scale smoothly between a 320px phone and a wide desktop,
      // so they never need a different size per breakpoint or wrap awkwardly.
      fontSize: {
        "display-xl": ["clamp(2.5rem, 1.2rem + 5.4vw, 5.5rem)", { lineHeight: "1.0", letterSpacing: "-0.035em", fontWeight: "700" }],
        "display-lg": ["clamp(2rem, 1.4rem + 2.4vw, 3.25rem)", { lineHeight: "1.06", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-md": ["clamp(1.5rem, 1.25rem + 1.1vw, 2.125rem)", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        rise: "rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.35s ease-out both",
        float: "float 7s ease-in-out infinite",
      },
      // One easing curve for every hover and entrance so the whole product moves the same way:
      // quick to start, a long soft landing.
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      boxShadow: {
        "glow-gold": "0 10px 30px -8px rgba(198, 167, 106, 0.55)",
        soft: "0 1px 2px rgba(38, 51, 45, 0.04), 0 6px 20px -6px rgba(38, 51, 45, 0.08)",
        lift: "0 2px 4px rgba(38, 51, 45, 0.04), 0 18px 40px -12px rgba(38, 51, 45, 0.16)",
        glow: "0 10px 30px -8px rgba(52, 92, 74, 0.45)",
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
  // Hover effects apply only where a real pointer can hover. On a phone a tap would otherwise leave
  // the lifted or recoloured "hover" state stuck on until the next tap.
  future: { hoverOnlyWhenSupported: true },
  plugins: [],
};
export default config;
