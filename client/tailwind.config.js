/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        void: "#050507",
        surface: "#0d0d14",
        card: "#13131f",
        border: "#1e1e2e",
        muted: "#2a2a3e",
        subtle: "#3d3d5c",
        faint: "#6b6b8a",
        dim: "#9999b3",
        ghost: "#c0c0d6",
        white: "#f0f0ff",
        accent: {
          DEFAULT: "#7c3aed",
          light: "#a78bfa",
          glow: "#4c1d95",
        },
        electric: {
          DEFAULT: "#06b6d4",
          light: "#67e8f9",
          dark: "#0e7490",
        },
        neon: {
          green: "#10b981",
          pink: "#ec4899",
          orange: "#f59e0b",
          red: "#ef4444",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(124, 58, 237, 0.4)",
        "glow-lg": "0 0 40px rgba(124, 58, 237, 0.3)",
        "glow-electric": "0 0 20px rgba(6, 182, 212, 0.4)",
        "inner-glow": "inset 0 0 20px rgba(124, 58, 237, 0.1)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.6)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "spin-slow": "spin 4s linear infinite",
        breathe: "breathe 4s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
