import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Syne", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      colors: {
        rail: {
          blue: "#185FA5",
          "blue-light": "#E6F1FB",
          "blue-dark": "#0C447C",
          green: "#3B6D11",
          "green-light": "#EAF3DE",
          amber: "#854F0B",
          "amber-light": "#FAEEDA",
          red: "#A32D2D",
          "red-light": "#FCEBEB",
        },
      },
    },
  },
  plugins: [],
};
export default config;
