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
    ],
  },
  ssr: { noExternal: ['solid-js', '@solidjs/web', 'base-ui-solid', '@base-ui-solid/utils'] },
  plugins: [
    requestPathsPlugin(),
    markdownPlugin(),
    sourcePlugin(),
    searchIndexPlugin(),
    { ...mdx(mdxOptions), enforce: 'pre' },
    tanstackStart({ prerender: { enabled: true, crawlLinks: false, failOnError: true } }),
    solid({ ssr: true, extensions: ['.mdx'], solid: { hydratable: true } }),
    tailwind(),
  ],
});
