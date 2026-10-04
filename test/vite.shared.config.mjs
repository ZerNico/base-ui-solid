import * as path from 'path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwind from '@tailwindcss/vite';

const shouldDisableWorkspaceAliases = Boolean(process.env.MUI_DISABLE_WORKSPACE_ALIASES);

export default defineConfig({
  mode: process.env.NODE_ENV || 'development',
  // Port note: upstream uses `@vitejs/plugin-react` and generates Tailwind classes through
  // `@tailwindcss/postcss` in `postcss.config.js`. The docs of this port use `@tailwindcss/vite`,
  // so the fixtures do too.
  plugins: [solid(), tailwind()],
  resolve: {
    // Port note: the docs demos and the packages must share one Solid runtime.
    dedupe: ['solid-js', '@solidjs/web'],
    alias: {
      ...(shouldDisableWorkspaceAliases
        ? undefined
        : {
            'base-ui-solid': path.join(process.cwd(), 'packages/solid/src'),
            '@base-ui-solid/utils': path.join(process.cwd(), 'packages/utils/src'),
          }),
      './fonts': path.join(process.cwd(), '/docs/src/css/fonts'),
      docs: path.join(process.cwd(), '/docs'),
      stream: '',
      zlib: '',
    },
  },
  build: { outDir: 'build', chunkSizeWarningLimit: 9999 },
});
