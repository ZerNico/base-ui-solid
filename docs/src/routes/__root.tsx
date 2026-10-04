import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/solid-router';
import siteStyles from '../css/site.css?url';

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: siteStyles }],
    meta: [
      { title: 'Base UI · Solid' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }),
  component: () => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
