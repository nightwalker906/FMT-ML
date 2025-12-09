import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0d9488',      // Teal 600 - Brand color
        secondary: '#34d399',    // Emerald 400 - Action/Growth
        accent: '#f59e0b',       // Amber 500 - Alerts/Highlights
        dark: '#1e293b',         // Slate 800 - Text
        background: '#f8fafc',   // Slate 50 - Clean background
      },
    },
  },
  plugins: [],
}
export default config
