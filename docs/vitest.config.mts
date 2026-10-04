import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { searchIndexPlugin } from './src/mdx/searchIndexPlugin.mjs';

export default defineConfig({
  plugins: [searchIndexPlugin()],
  test: {
    include: [],
    environment: process.env.VITEST_ENV === 'jsdom' ? 'jsdom' : 'node',
    projects: [
      { extends: true, test: { name: 'docs', include: ['src/**/*.test.mjs'] } },
      {
        extends: true,
        test: {
          name: 'markdown',
          include: ['scripts/**/*.test.mjs'],
          environment: 'node',
          browser: { enabled: false },
        },
      },
    ],
    browser:
      process.env.VITEST_ENV === 'chromium'
        ? {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          }
        : undefined,
  },
});
