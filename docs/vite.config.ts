import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import mdx from '@mdx-js/rollup';
import tailwind from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/solid-start/plugin/vite';
import { markdownPlugin } from './src/mdx/markdownPlugin.mjs';
import { requestPathsPlugin } from './src/mdx/requestPathsPlugin.mjs';
import { searchIndexPlugin } from './src/mdx/searchIndexPlugin.mjs';
import { sourcePlugin } from './src/mdx/sourcePlugin.mjs';
import { mdxOptions } from './src/mdx/options.mjs';
import { listMarkdownPages } from './scripts/generateLlmTxt/index.mjs';
import { SITE_URL } from './src/config';

// Port note: the generated Markdown and llms.txt files aren't linked from rendered HTML in a way
// the prerenderer follows, so list them explicitly. They stay out of the sitemap.
const generatedFiles = [
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
  '/index.md',
  ...(await listMarkdownPages()).map((page) => page.mdUrlPath),
].map((path) => ({ path, prerender: { enabled: true }, sitemap: { exclude: true } }));
// Pages that are prerendered but don't belong in the sitemap (robots.txt disallows /playground/).
const unlistedPages = ['/playground', '/production-error', '/solid/'].map((path) => ({
  path,
  sitemap: { exclude: true },
}));

export default defineConfig({
  // Port note: bind prerender previews to IPv4 to avoid localhost IPv6 connection timeouts.
  preview: { host: '127.0.0.1' },
  // Port note: workspace components and Start must share Solid's SSR owner/context runtime.
  resolve: {
    dedupe: ['solid-js', '@solidjs/web'],
    alias: { docs: fileURLToPath(new URL('.', import.meta.url)) },
  },
  // Port note: prebundle the deferred search dependencies before the first query.
  optimizeDeps: {
    include: [
      'solid-js/refresh',
      '@mui/internal-docs-infra/resolvePageUrl',
      '@orama/orama',
      '@orama/plugin-qps',
      '@orama/stemmers/english',
      // Imported by demos only, so the dependency scan can't find them before a page needs them.
      // Optimizing them on demand reloads the page mid-hydration, leaving it non-interactive.
      '@tanstack/virtual-core',
      'match-sorter',
      'zod',
    ],
  },
  ssr: { noExternal: ['solid-js', '@solidjs/web', 'base-ui-solid', '@base-ui-solid/utils'] },
  plugins: [
    requestPathsPlugin(),
    markdownPlugin(),
    sourcePlugin(),
    searchIndexPlugin(),
    { ...mdx(mdxOptions), enforce: 'pre' },
    tanstackStart({
      prerender: { enabled: true, crawlLinks: false, failOnError: true },
      pages: [...generatedFiles, ...unlistedPages],
      sitemap: { enabled: true, host: SITE_URL },
    }),
    solid({ ssr: true, extensions: ['.mdx'], solid: { hydratable: true } }),
    tailwind(),
  ],
});
