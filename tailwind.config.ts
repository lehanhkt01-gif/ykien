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
        gov: {
          red: "#b91c1c",
          redDark: "#991b1b",
          redLight: "#fef2f2",
          gold: "#d97706",
          goldLight: "#fef3c7",
          blue: "#1e3a8a",
          blueDark: "#0f172a",
          blueLight: "#eff6ff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
