import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          400: "#2DD4BF",
          500: "#14B8A6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config
