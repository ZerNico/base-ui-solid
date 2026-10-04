// Port note: the upstream static host applies these demo redirects; Vite needs the same rules.
export function requestPathsPlugin() {
  return {
    name: 'docs-request-paths',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        let target;
        if (['/drafts', '/trash'].includes(url.pathname) || url.pathname.startsWith('/inbox')) {
          target = '/';
        } else if (url.pathname === '/r/invalid-render-prop') {
          target = '/react/handbook/composition';
        } else if (url.pathname === '/react/components/radio') {
          target = '/react/components/radio-group';
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
    },
  };
}
