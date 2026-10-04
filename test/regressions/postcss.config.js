// Port note: upstream also runs `@tailwindcss/postcss` here. The port generates Tailwind classes
// with `@tailwindcss/vite` (see `../vite.shared.config.mjs`), like its docs.
export default {
  plugins: {
    'postcss-import': {},
    'postcss-custom-media': {},
  },
};
