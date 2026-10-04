import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import mdx from '@mdx-js/rollup';
import tailwind from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/solid-start/plugin/vite';
import { sourcePlugin } from './src/mdx/sourcePlugin.mjs';
import { mdxOptions } from './src/mdx/options.mjs';

export default defineConfig({
  // Port note: bind prerender previews to IPv4 to avoid localhost IPv6 connection timeouts.
  preview: { host: '127.0.0.1' },
  resolve: { alias: { docs: fileURLToPath(new URL('.', import.meta.url)) } },
  plugins: [
    sourcePlugin(),
    { ...mdx(mdxOptions), enforce: 'pre' },
    tanstackStart({ prerender: { enabled: true, crawlLinks: false, failOnError: true } }),
    solid({ ssr: true, extensions: ['.mdx'], solid: { hydratable: true } }),
    tailwind(),
  ],
});
