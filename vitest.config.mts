import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.mts'],
    reporters: process.env.CI
      ? ['default', ['junit', { outputFile: './test-results/junit.xml' }]]
      : ['default'],
  },
});
