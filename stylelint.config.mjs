// Port note: mirrors upstream's `stylelint.config.mjs`. The docs-specific parts (the
// `no-unknown-demo-colors` plugin and the `docs/**` overrides incl. stylelint-config-tailwindcss)
// are left out until the docs site is ported.
// TODO(port): restore the docs overrides with the docs site.

// Note: To debug stylelint config resolution for a specific file, use
//         pnpm exec stylelint --print-config <path-to-file>

/** @type {import('stylelint').Config} */
export default {
  extends: '@mui/internal-code-infra/stylelint',
  rules: {
    // empty lines help with readability
    'declaration-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'comment-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'function-no-unknown': true,
    'number-max-precision': 5,

    'no-descending-specificity': null, // Some styles depend on order
  },
};
