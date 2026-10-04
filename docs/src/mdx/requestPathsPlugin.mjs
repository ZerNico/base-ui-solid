import { legacyPath } from './legacyPaths.mjs';

// Port note: the upstream static host applies these demo redirects; Vite needs the same rules.
export function requestPathsPlugin() {
  return {
    name: 'docs-request-paths',
    configureServer: configure,
    configurePreviewServer: configure,
  };

  function configure(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      let target = legacyPath(url.pathname);
      if (target) {
        target += url.search;
      } else if (
        ['/drafts', '/trash'].includes(url.pathname) ||
        url.pathname.startsWith('/inbox')
      ) {
        target = '/';
      } else if (url.pathname === '/r/invalid-render-prop') {
        target = '/solid/handbook/composition';
      } else if (url.pathname === '/solid/components/radio') {
        target = '/solid/components/radio-group';
      } else if (url.pathname === '/r/discord') {
        target = 'https://discord.com/invite/g6C3hUtuxz';
      }
      if (target) {
        response.statusCode = 301;
        response.setHeader('Location', target);
        response.end();
      } else {
        next();
      }
    });
  }
}
