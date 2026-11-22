import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FDFCFB", // Warm off-white editorial paper background
        surface: "#FFFFFF",
        border: "#EAE7E2",
        muted: "#F5F3EF",
        charcoal: {
          900: "#111110",
          800: "#222120",
          700: "#383634",
          500: "#6B6764",
          400: "#9C9792",
        },
        accent: {
          DEFAULT: "#C2410C", // Restrained editorial terracotta / warm burnt orange
          hover: "#9A3412",
          light: "#FFEDD5",
        },
        emerald: {
          DEFAULT: "#059669",
          light: "#D1FAE5",
        }
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: '#222120',
            lineHeight: '1.75',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
