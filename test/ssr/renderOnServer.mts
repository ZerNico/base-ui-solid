import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

let serverPromise: Promise<ViteDevServer> | undefined;

function getServer() {
  serverPromise ??= createServer({
    root: WORKSPACE_ROOT,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    plugins: [solid({ ssr: true, refresh: { disabled: true } })],
  });
  return serverPromise;
}

/**
 * Closes the SSR server, if one was started. Called when the Vitest server shuts down (see
 * `ssrFixturesPlugin` in `vitest.shared.mts`), so it doesn't keep the process alive.
 */
export async function closeSsrServer() {
  const pending = serverPromise;
  serverPromise = undefined;
  if (pending) {
    await (await pending).close();
  }
}

/**
 * Renders `exportName` from the module at `moduleId` (a path relative to the workspace root) with
 * Solid's server build, and returns the HTML.
 */
export async function renderOnServer(moduleId: string, exportName: string, props: unknown) {
  const server = await getServer();
  const [mod, web, solidJs] = await Promise.all([
    server.ssrLoadModule(moduleId),
    server.ssrLoadModule('@solidjs/web'),
    server.ssrLoadModule('solid-js'),
  ]);
  const Component = mod[exportName];
  if (typeof Component !== 'function') {
    throw new Error(`renderOnServer: ${moduleId} has no component export "${exportName}".`);
  }
  const html = web.renderToString(() => solidJs.createComponent(Component, props ?? {})) as string;
  // The bootstrap script a server-rendered page includes; hydration reads its `_$HY` global.
  const scriptTag = web.generateHydrationScript() as string;
  const hydrationScript = scriptTag.slice(
    scriptTag.indexOf('>') + 1,
    scriptTag.indexOf('</script>'),
  );
  return { html, hydrationScript };
}
