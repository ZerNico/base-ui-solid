import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/releases/v1-0-0-alpha-6/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-0-0-alpha-6')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'v1.0.0-alpha.6' },
      {
        name: 'description',
        content: metadata.description ?? 'v1.0.0-alpha.6 release notes. Feb 6, 2025.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
