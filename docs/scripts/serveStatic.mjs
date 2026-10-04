import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { legacyPath } from '../src/mdx/legacyPaths.mjs';

// Port note: reuse the installed serve CLI's static handler; intercept framework redirects
// ourselves because its wildcard destination encodes slashes and discards query strings.
const require = createRequire(import.meta.resolve('serve/package.json'));
const handler = require('serve-handler');

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const target = legacyPath(url.pathname);
  if (target) {
    response.writeHead(301, { Location: target + url.search });
    response.end();
    return;
  }
  void handler(request, response, {
    public: fileURLToPath(new URL('../export', import.meta.url)),
    redirects: [
      {
        source: '/solid/components/radio',
        destination: '/solid/components/radio-group',
        type: 301,
      },
      { source: '/r/invalid-render-prop', destination: '/solid/handbook/composition', type: 301 },
      { source: '/drafts', destination: '/', type: 301 },
      { source: '/trash', destination: '/', type: 301 },
      { source: '/inbox/:path*', destination: '/', type: 301 },
      { source: '/r/discord', destination: 'https://discord.com/invite/g6C3hUtuxz', type: 302 },
    ],
  });
}).listen(Number(process.env.PORT ?? 3010));
