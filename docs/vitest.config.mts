import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
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
