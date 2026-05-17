export default {
  plugins: {
    // 1. Injects Tailwind's utility classes based on your tailwind.config.js
    tailwindcss: {},
    
    // 2. Automatically adds vendor prefixes (like -webkit- or -moz-)
    // to ensure modern CSS works on older browsers (Safari 12, IE 11, etc.)
    autoprefixer: {},
  },
}