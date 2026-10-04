import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/quick-start/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/quick-start')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Quick start' },
      {
        name: 'description',
        content: metadata.description ?? 'A quick guide to getting started with Base\u00a0UI.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
