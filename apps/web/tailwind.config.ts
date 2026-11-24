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
          50: "#FAF9F7",
          100: "#F2EFE9",
          200: "#E5E0D8",
          300: "#CEC8BF",
          400: "#9C9792",
          500: "#6B6764",
          600: "#524E4B",
          700: "#383634",
          800: "#222120",
          900: "#111110",
        },
        accent: {
          DEFAULT: "#C2410C", // Restrained editorial terracotta / warm burnt orange
          hover: "#9A3412",
          light: "#FFEDD5",
        },
        emerald: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          DEFAULT: "#059669",
          light: "#D1FAE5",
        },
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
