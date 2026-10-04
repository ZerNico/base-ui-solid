import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/solid-router';
import { lazy } from 'solid-js';

import { SITE_URL } from '../config';
import siteStyles from '../css/site.css?url';

// Port note: unknown URLs load the website layout without adding it to every docs page.
const NotFoundPage = lazy(() => import('../app/global-not-found'));

export const Route = createRootRoute({
  notFoundComponent: NotFoundPage,
  head: ({ matches }) => ({
    links: [
      { rel: 'canonical', href: new URL(matches.at(-1)?.pathname ?? '/', SITE_URL).href },
      { rel: 'stylesheet', href: siteStyles },
      { rel: 'icon', href: '/static/favicon.svg', type: 'image/svg+xml' },
    ],
    meta: [
      { title: 'Base UI Solid' },
      { property: 'og:url', content: new URL(matches.at(-1)?.pathname ?? '/', SITE_URL).href },
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
