import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "foreground-heading": "var(--foreground-heading)",
        sidebar: "var(--sidebar)",
        "sidebar-border": "var(--sidebar-border)",
        card: "var(--card)",
        border: "var(--border)",
        secondary: "var(--secondary)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        "signal-green": "var(--signal-green)",
        "data-blue": "var(--data-blue)",
        "amber-accent": "var(--amber-accent)",
        danger: "var(--danger)",
        ring: "var(--ring)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "signal-glow": "0 0 20px var(--signal-green-glow)",
        "card-hover": "0 0 0 1px var(--data-blue), 0 4px 14px rgba(56, 189, 248, 0.08)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
