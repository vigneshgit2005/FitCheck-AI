export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        cream: '#F5F0E8',
        charcoal: '#1C1C1E',
        mink: '#8B7355',
        blush: '#E8C4B8',
        sage: '#7C9A7E',
        slate: '#4A5568',
      },
    },
  },
  plugins: [],
}
