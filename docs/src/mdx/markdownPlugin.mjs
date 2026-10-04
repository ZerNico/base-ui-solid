import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
// Port note: upstream's generation runs before builds; Vite also refreshes public
// Markdown when its source changes so development links never serve stale pages.
export function markdownPlugin() {
  return {
    name: 'docs-markdown',
    // Port note: runtime error messages from the package also contain docs URLs.
    // Keep the package independent of docs deployment configuration.
    transform(code, id) {
      if (id.includes('/packages/solid/src/')) {
        return code.replaceAll('https://base-ui.com/react/', '/react/');
      }
      return undefined;
    },
    configureServer(server) {
      let pending = Promise.resolve();
      let timer;
      server.watcher.on('change', (file) => {
        if (!file.includes('/src/') && !file.includes('/reference/')) {
          return;
        }
        clearTimeout(timer);
        timer = setTimeout(() => {
          pending = pending
            .then(() =>
              run(process.execPath, [
                fileURLToPath(new URL('../../scripts/generateDocsIndex.mjs', import.meta.url)),
              ]),
            )
            .catch((error) => {
              server.config.logger.error(error.stderr || error.message);
            });
        }, 100);
      });
      server.middlewares.use((request, _response, next) => {
        if (/\.(md|txt)(?:\?|$)/.test(request.url ?? '')) {
          void pending.then(() => next());
        } else {
          next();
        }
      });
      server.httpServer?.on('close', () => clearTimeout(timer));
    },
  };
}
