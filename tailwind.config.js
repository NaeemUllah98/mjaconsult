/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      colors: {
        // Brand palette derived from the MJACONSULT logo (navy -> teal gradient)
        brand: {
          50: "#eef7fa",
          100: "#d4ecf2",
          200: "#a9d8e6",
          300: "#71bcd2",
          400: "#3f9cb8",
          500: "#2c7da0", // primary teal-blue
          600: "#236485",
          700: "#1b4f6c",
          800: "#163e56",
          900: "#0d3b54", // deep navy
          950: "#072433",
        },
        teal: {
          400: "#34a0a4",
          500: "#2a9d8f",
          600: "#21867b",
        },
        ink: {
          DEFAULT: "#0f2230",
          soft: "#3a4a57",
          muted: "#6b7c89",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f6fafb",
          muted: "#eef3f5",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #0d3b54 0%, #1b4f6c 40%, #2c7da0 70%, #34a0a4 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, #eef7fa 0%, #d4ecf2 100%)",
        "hero-glow":
          "radial-gradient(60% 60% at 50% 0%, rgba(52,160,164,0.18) 0%, rgba(13,59,84,0) 70%)",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(13,59,84,0.08), 0 4px 24px -4px rgba(13,59,84,0.06)",
        card: "0 1px 3px rgba(13,59,84,0.06), 0 10px 40px -12px rgba(13,59,84,0.12)",
        glow: "0 8px 30px -6px rgba(44,125,160,0.35)",
        "glow-teal": "0 8px 30px -6px rgba(52,160,164,0.4)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.5" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
