import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/solid-router';
import '../css/index.css';
import '../css/mdx-components.css';
import '../css/port.css';

export const Route = createRootRoute({
  head: () => ({
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
