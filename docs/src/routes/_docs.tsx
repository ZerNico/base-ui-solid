import { createFileRoute, Outlet } from '@tanstack/solid-router';
import docsStyles from '../css/docs.css?url';
import { DocsLayout } from '../components/DocsLayout';

export const Route = createFileRoute('/_docs')({
  head: () => ({
    links: [
      { rel: 'stylesheet', href: docsStyles },
      ...['die-grotesk-a-regular', 'die-grotesk-a-bold', 'die-grotesk-b-bold', 'paper-mono'].map(
        (font) => ({
          rel: 'preload',
          href: `/fonts/${font}.woff2`,
          as: 'font' as const,
          type: 'font/woff2',
          crossorigin: 'anonymous' as const,
        }),
      ),
    ],
  }),
  component: () => (
    <DocsLayout>
      <Outlet />
    </DocsLayout>
  ),
});
