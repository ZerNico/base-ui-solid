import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { searchIndexPlugin } from './src/mdx/searchIndexPlugin.mjs';

export default defineConfig({
  plugins: [searchIndexPlugin()],
  test: {
    include: ['src/**/*.test.mjs'],
    environment: process.env.VITEST_ENV === 'jsdom' ? 'jsdom' : 'node',
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
