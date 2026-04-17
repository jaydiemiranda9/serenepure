/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#0a1628',
        paper: '#f7f9fc',
        'paper-dark': '#e8eef5',
        water: '#1e6091',
        'water-light': '#4a9ec7',
        'water-mist': '#cfe4f0',
        drop: '#2ba5d4',
        rule: '#0a1628',
        danger: '#c1272d',
        success: '#1d7a46',
        muted: '#5a6b7a',
      },
    },
  },
  plugins: [],
};
