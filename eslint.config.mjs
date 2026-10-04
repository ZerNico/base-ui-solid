// Port note: mirrors upstream's `eslint.config.mjs` (mui/base-ui) block by block. Deviations:
// - React-specific rule sets (`react/*`, `react-hooks/*`, `react-compiler/*`) that
//   `createBaseConfig()` enables are turned off for our files and replaced by
//   `eslint-plugin-solid` (see "Solid instead of React" below).
// - The docs block uses Solid Start in place of Next.js.
// - The playground block targets our Vite playground (`playground/`), not `playground/vite-app`.
import {
  baseSpecRules,
  createBaseConfig,
  createDocsConfig,
  createTestConfig,
  EXTENSION_TEST_FILE,
  EXTENSION_TS,
} from '@mui/internal-code-infra/eslint';
import solid from 'eslint-plugin-solid/configs/v2';
import solidTypescript from 'eslint-plugin-solid/configs/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';
import * as path from 'node:path';
import { fileURLToPath } from 'url';
import remarkConfig from './.remarkrc.mjs';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const baseConfig = createBaseConfig({
  baseDirectory: dirname,
  markdown: true,
  consistentTypeImports: true,
});

// Flat config replaces rule options rather than merging them, so any block that sets
// `no-restricted-syntax` for a narrower set of files drops everything the base config declared.
// Re-including these keeps the shared restrictions (React namespace imports, `throw Error()`,
// the `window.setTimeout` family) in force wherever an override adds an entry of its own.
const baseRestrictedSyntax = baseConfig
  .flatMap((entry) => entry.rules?.['no-restricted-syntax'] ?? [])
  .filter((entry) => typeof entry === 'object');

if (baseRestrictedSyntax.length === 0) {
  // Extracting nothing would silently drop every shared restriction from the overrides below,
  // which is the failure this re-inclusion exists to prevent — so fail loudly instead.
  throw new Error(
    'eslint.config.mjs: found no `no-restricted-syntax` entries in the base config. ' +
      'Its shape likely changed; update the extraction above before the overrides lose these rules.',
  );
}

// Port note: Solid instead of React. `createBaseConfig()` (and `createTestConfig()`, which pulls
// in `testing-library/flat/react`) enable eslint-plugin-react, eslint-plugin-react-hooks and
// (optionally) eslint-plugin-react-compiler. Their rules encode React semantics (hook rules,
// dependency arrays, `className`/`htmlFor`, keys, fragments, ...) that are wrong or meaningless for
// Solid, so every rule from those plugins is collected here and switched off; `eslint-plugin-solid`
// (`v2` preset, since we target Solid 2.0) takes their place.
const REACT_RULE_PREFIXES = ['react/', 'react-hooks/', 'react-compiler/'];
const reactRulesOff = Object.fromEntries(
  [...baseConfig, ...createTestConfig()]
    .flatMap((entry) => [
      ...Object.keys(entry.rules ?? {}),
      ...Object.entries(entry.plugins ?? {}).flatMap(([pluginName, plugin]) =>
        Object.keys(plugin.rules ?? {}).map((ruleName) => `${pluginName}/${ruleName}`),
      ),
    ])
    .filter((ruleName) => REACT_RULE_PREFIXES.some((prefix) => ruleName.startsWith(prefix)))
    .map((ruleName) => [ruleName, 'off']),
);

// Port note: `mui/no-floating-cleanup` reports every discarded call that returns a function. In
// Solid 2.0 `onCleanup()` returns a `Disposable` (to unregister the cleanup early), and discarding
// it is the idiomatic usage — it's the equivalent of returning a cleanup from a React effect, not a
// leaked subscription. This wraps the upstream rule and drops reports for `onCleanup(...)` calls
// only; everything else is still reported (opt out per call site with `void`, as upstream does).
const muiPlugin = baseConfig.find((entry) => entry.plugins?.mui)?.plugins.mui;
if (!muiPlugin?.rules?.['no-floating-cleanup']) {
  throw new Error(
    'eslint.config.mjs: could not find `mui/no-floating-cleanup` in the base config.',
  );
}
const SOLID_DISCARDABLE_CALLS = new Set(['onCleanup']);
const solidPortPlugin = {
  meta: { name: 'base-ui-solid' },
  rules: {
    'no-floating-cleanup': {
      ...muiPlugin.rules['no-floating-cleanup'],
      create(context) {
        const filteredContext = Object.create(context, {
          report: {
            value(descriptor) {
              const callee = descriptor.node?.callee;
              if (callee?.type === 'Identifier' && SOLID_DISCARDABLE_CALLS.has(callee.name)) {
                return;
              }
              context.report(descriptor);
            },
          },
        });
        return muiPlugin.rules['no-floating-cleanup'].create(filteredContext);
      },
    },
  },
};

const OneLevelImportMessage = [
  'Prefer one level nested imports to avoid bundling everything in dev mode or breaking CJS/ESM split.',
  'See https://github.com/mui/material-ui/pull/24147 for the kind of win it can unlock.',
].join('\n');

const NO_RESTRICTED_IMPORTS_PATTERNS_DEEPLY_NESTED = [
  {
    regex: '^base-ui-solid/(?:(?!internals/).+|internals/.+)/.+',
    message: OneLevelImportMessage,
  },
];

export default defineConfig(
  globalIgnores([
    './examples',
    './playground/dist',
    './docs/dist',
    './docs/export',
    './docs/.tanstack',
    './docs/src/routeTree.gen.ts',
  ]),
  baseConfig,
  // eslint-plugin-mdx loads `.remarkrc.mjs` itself, but ESLint doesn't know
  // that file is a config dependency, so `--cache` doesn't invalidate when
  // it changes. Embedding the imported value in a setting puts its content
  // into the resolved-config hash, forcing cache invalidation on edits.
  { settings: { remarkConfig } },
  {
    name: 'Playground Vite app overrides',
    files: ['playground/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    name: 'Base UI overrides',
    files: [`**/*${EXTENSION_TS}`],
    settings: {
      'import/resolver': {
        typescript: {
          project: ['tsconfig.json'],
        },
      },
    },
    /**
     * Sorted alphanumerically within each group. built-in and each plugin form
     * their own groups.
     */
    rules: {
      // @TODO: Remove this once we move away from namespaces
      '@typescript-eslint/no-namespace': 'off',
      'import/export': 'off', // FIXME: Maximum call stack exceeded
      'no-restricted-imports': [
        'error',
        {
          patterns: NO_RESTRICTED_IMPORTS_PATTERNS_DEEPLY_NESTED,
        },
      ],
      // We LOVE non-breaking spaces, and both straight and curly quotes here
      'no-irregular-whitespace': ['warn', { skipJSXText: true, skipStrings: true }],

      // This prevents us from creating components like `<h1 {...props} />`
      'jsx-a11y/heading-has-content': 'off',
      'jsx-a11y/anchor-has-content': 'off',

      // This rule doesn't recognise <label> wrapped around custom controls
      'jsx-a11y/label-has-associated-control': 'off',
    },
  },
  {
    name: 'Solid instead of React',
    files: [`**/*${EXTENSION_TS}`],
    extends: [solid],
    rules: {
      ...reactRulesOff,
      // TypeScript already reports undefined JSX identifiers; same setting as the plugin's
      // `typescript` preset.
      'solid/jsx-no-undef': solidTypescript.rules['solid/jsx-no-undef'],
      // Off: the heuristic misreads the port's conventions (PORTING.md): accessor params and
      // returns, prop-getter arrays like `(props) => validation.getValidationProps(disabled(), props)`
      // that `useRenderElement` evaluates in a tracked scope, `mergeProps`' array parameter named
      // `props`, inline `merge()`/`omit()`/`createMemo()` arguments. Every report on the initial code
      // base was a false positive. Reactivity is covered by the jsdom + Chromium suites and Solid's
      // dev diagnostics (see "Tests" in PORTING.md). This also replaces upstream's
      // `react-hooks/exhaustive-deps` (`additionalHooks: 'useIsoLayoutEffect'`): Solid effects take
      // an explicit deps accessor (`() => [deps]`) instead of a dependency array.
      'solid/reactivity': 'off',
    },
  },
  {
    files: [`packages/*/src/**/*${EXTENSION_TS}`],
    ignores: [`**/*${EXTENSION_TEST_FILE}`, `**/*.spec${EXTENSION_TS}`, `test/**/*${EXTENSION_TS}`],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: dirname,
      },
    },
    plugins: {
      'base-ui-solid': solidPortPlugin,
    },
    rules: {
      'mui/add-undef-to-optional': 'error',
      // Port note: upstream enables `mui/disallow-react-api-in-server-components`, which requires a
      // `'use client'` directive before using `useIsoLayoutEffect`/React client APIs. Solid has no
      // React Server Components, so the port drops `'use client'` and the rule is off.
      'mui/disallow-react-api-in-server-components': 'off',
      // Port note: Solid-aware wrapper of `mui/no-floating-cleanup`, see `solidPortPlugin` above.
      'mui/no-floating-cleanup': 'off',
      'base-ui-solid/no-floating-cleanup': 'error',
    },
  },
  {
    files: [
      // matching the pattern of the test runner
      `**/*${EXTENSION_TEST_FILE}`,
    ],
    extends: createTestConfig(),
    rules: {
      // `createTestConfig()` re-enables `testing-library/flat/react` rules; keep React rules off.
      ...reactRulesOff,
      // Port note: test fixtures mirror upstream's `.map()` lists (static arrays) one to one.
      'solid/prefer-for': 'off',
      // Port note: hard skips are part of the port's test policy (PORTING.md "Tests"): each
      // `it.skip`/`describe.skip` carries a `React-only` or `TODO(port): needs <Component>` reason
      // and is tracked by `pnpm test:compare-upstream`, which keeps names/skips in sync with upstream.
      'vitest/no-disabled-tests': 'off',
      'mui/add-undef-to-optional': 'off',
      // Tests type lazily-loaded modules with `typeof import('./x')`, which the rule's
      // `disallowTypeAnnotations` default rejects. Top-level type imports stay enforced.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports', disallowTypeAnnotations: false },
      ],
      // These helpers assert internally (shared between multiple tests).
      'vitest/expect-expect': [
        'error',
        {
          assertFunctionNames: [
            'expect',
            'expect*',
            'assert*',
            'openAndCloseDialog',
            'openAndClosePopover',
            'takeScreenshot',
            'waitForBubbleToOverlapActiveTab',
          ],
        },
      ],
      // Parameterized suites pass loop variables as titles.
      'vitest/valid-title': ['error', { allowArguments: true }],
      'no-restricted-syntax': [
        'error',
        ...baseRestrictedSyntax,
        {
          // `timeStamp` is read-only and not an `EventInit` member, so `fireEvent` accepts it from
          // the type system and then silently drops it: the event ends up stamped off the
          // environment's clock instead, which is the real one in a browser. Velocity-sensitive
          // assertions then depend on how long the runner took between two calls.
          selector:
            "CallExpression[callee.object.name='fireEvent'] ObjectExpression > Property[key.name='timeStamp']",
          message:
            '`fireEvent` silently drops `timeStamp`, so the event is stamped off the environment clock ' +
            '— the real one in a browser. Use `firePointer` from `#test-utils` for pointer events; ' +
            'touch events have no equivalent helper yet.',
        },
      ],
    },
  },
  {
    files: [`test/e2e/**/*${EXTENSION_TEST_FILE}`],
    rules: {
      // The e2e suite asserts with Playwright's `expect` (initPlaywrightMatchers),
      // which the scope-naive vitest globals rule mistakes for the vitest global.
      'vitest/prefer-importing-vitest-globals': 'off',
    },
  },
  baseSpecRules,
  {
    name: 'MUI ESLint config for docs (Solid Start)',
    files: [`docs/**/*${EXTENSION_TS}`],
    extends: createDocsConfig(),
    rules: {
      ...reactRulesOff,
      // Port note: Solid Start has no Next.js link, document, or image conventions.
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-head-element': 'off',
      // Port note: upstream code blocks are keyboard-scrollable pre elements.
      'jsx-a11y/no-noninteractive-tabindex': 'off',
      'mui/disallow-react-api-in-server-components': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      'import/extensions': [
        'error',
        'ignorePackages',
        { ts: 'never', tsx: 'never', mjs: 'always' },
      ],
    },
    settings: {
      'import/resolver': { typescript: { project: ['docs/tsconfig.json', 'tsconfig.json'] } },
    },
  },
  {
    files: [`test/**/*${EXTENSION_TS}`],
    rules: {
      'guard-for-in': 'off',
      'testing-library/prefer-screen-queries': 'off', // Enable usage of playwright queries
      'testing-library/no-await-sync-queries': 'off',
      'testing-library/render-result-naming-convention': 'off', // inconsequential in regression tests
      'mui/consistent-production-guard': 'off',
    },
  },
);
