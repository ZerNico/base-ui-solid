import { createFileRoute, Outlet } from '@tanstack/solid-router';
import websiteStyles from '../app/(website)/css/index.css?url';
import Layout from '../app/(website)/layout';

export const Route = createFileRoute('/_website')({
  head: () => ({
    links: [
      { rel: 'stylesheet', href: websiteStyles },
      {
        rel: 'preload',
        href: '/fonts/die-grotesk-a-regular.woff2',
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/die-grotesk-b-regular.woff2',
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
      { rel: 'icon', href: '/static/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/static/apple-touch-icon.png' },
    ],
  }),
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});
