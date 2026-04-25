import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        muted: "#687789",
        line: "#dbe4ee",
        panel: "#ffffff",
        canvas: "#f5f7fa",
        brand: "#176b87",
        hot: "#b42318",
        warm: "#a15c07",
        cold: "#475467",
      },
    },
  },
  plugins: [],
};

export default config;
