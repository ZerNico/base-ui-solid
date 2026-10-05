import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import type { UserWorkspaceConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
import { playwright } from '@vitest/browser-playwright';
import {
  closeSsrServer,
  renderOnServer,
} from '@base-ui-solid/monorepo-tests/ssr/renderOnServer.mts';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(CURRENT_DIR, './');
const environment = process.env.VITEST_ENV;

type BrowserModeConfig = (UserWorkspaceConfig['test'] & {})['browser'];

const supportedBrowsers = new Set(['chromium', 'webkit', 'firefox'] as const);
type SupportedBrowser = typeof supportedBrowsers extends Set<infer U> ? U : never;

function isSupportedBrowser(env: string | undefined): env is SupportedBrowser {
  return !!env && (supportedBrowsers as Set<string>).has(env);
}

function getBrowserConfig(): BrowserModeConfig {
  if (!environment) {
    return undefined;
  }

  let instances;

  if (environment === 'all-browsers') {
    instances = Array.from(supportedBrowsers, (browser) => ({ browser }));
  } else if (isSupportedBrowser(environment)) {
    instances = [{ browser: environment }];
  } else {
    return undefined;
  }

  return {
    enabled: true,
    provider: playwright({
      contextOptions: {
        timezoneId: 'UTC',
      },
    }),
    screenshotFailures: false,
    commands: {
      renderOnServer: (_context, moduleId: string, exportName: string, props: unknown) =>
        renderOnServer(moduleId, exportName, props),
    },
    headless: true,
    instances,
  };
}

/**
 * Port note: upstream renders inline JSX on the server with `renderToString`. Solid compiles the
 * same JSX differently for the server and the client, so server-rendered trees live in
 * `*.fixtures.tsx` modules. This tags their exported components with their module id, which the
 * `renderToString` test helper uses to render them on the server.
 */
function ssrFixturesPlugin(): Plugin {
  return {
    name: 'base-ui-solid:ssr-fixtures',
    // Runs on the source, before the JSX transform rewrites the exports.
    enforce: 'pre',
    // The SSR server started by the `renderOnServer` browser command lives in this process.
    async closeBundle() {
      await closeSsrServer();
    },
    transform(code, id, options) {
      const file = id.split('?')[0];
      if (options?.ssr || !file.endsWith('.fixtures.tsx')) {
        return undefined;
      }
      const moduleId = `/${relative(WORKSPACE_ROOT, file)}`;
      const names = Array.from(
        code.matchAll(/export\s+(?:function|const)\s+([A-Za-z_$][\w$]*)/g),
        (match) => match[1],
      );
      const tags = names
        .map(
          (name) =>
            `if (typeof ${name} === 'function') Object.defineProperty(${name}, '__ssrSource', { value: { moduleId: ${JSON.stringify(moduleId)}, exportName: ${JSON.stringify(name)} } });`,
        )
        .join('\n');
      return { code: `${code}\n${tags}\n`, map: null };
    },
  };
}

const config: UserWorkspaceConfig = {
  // Compile client code as hydratable, so tests can hydrate server-rendered markup. In Vitest the
  // plugin compiles non-hydratable regardless of `ssr: true`; `solid.hydratable` overrides that.
  plugins: [
    solid({ ssr: true, solid: { hydratable: true }, refresh: { disabled: true } }),
    ssrFixturesPlugin(),
  ],
  test: {
    sequence: {
      hooks: 'list',
    },
    // Like upstream (Vitest's default include), the helpers' own tests in `test/` run too.
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'build', '**/*.spec.*'],
    globals: true,
    setupFiles: [resolve(WORKSPACE_ROOT, './test/setupVitest.ts')],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        pretendToBeVisual: true,
        url: 'http://localhost',
      },
    },
    browser: getBrowserConfig(),
    env: {
      VITEST: 'true',
    },
    // Avoid committing tests that influence their own retry
    retry: process.env.CI ? 1 : 0,
  },
};

export default config;
