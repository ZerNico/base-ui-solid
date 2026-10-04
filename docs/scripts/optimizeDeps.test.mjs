import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

// Demos are only imported lazily, so Vite's dependency scan can't find their packages. When a page
// then needs one, Vite optimizes it on demand and reloads mid-hydration, leaving the page
// non-interactive in dev. Every package a demo imports has to be pre-bundled instead.
const APP_DIR = path.resolve(import.meta.dirname, '../src/app');
const WORKSPACE_PACKAGES = /^(base-ui-solid|@base-ui-solid\/|solid-js|@solidjs\/)/;

function demoFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return demoFiles(fullPath);
    }
    return /\.(tsx?|jsx?)$/.test(entry.name) && fullPath.includes(`${path.sep}demos${path.sep}`)
      ? [fullPath]
      : [];
  });
}

function packageName(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

describe('optimizeDeps', () => {
  it('pre-bundles every package imported by demos', () => {
    const config =
      typeof viteConfig === 'function'
        ? viteConfig({ command: 'serve', mode: 'development' })
        : viteConfig;
    const include = config.optimizeDeps?.include ?? [];
    const missing = new Set();
    for (const file of demoFiles(APP_DIR)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const [, specifier] of source.matchAll(/^import\s(?!type\b)[^'"]*['"]([^'"]+)['"]/gm)) {
        if (specifier.startsWith('.') || specifier.startsWith('#') || specifier.startsWith('@/')) {
          continue;
        }
        if (WORKSPACE_PACKAGES.test(specifier)) {
          continue;
        }
        if (!include.some((entry) => entry === specifier || entry === packageName(specifier))) {
          missing.add(specifier);
        }
      }
    }
    expect([...missing].sort()).toEqual([]);
  });
});
