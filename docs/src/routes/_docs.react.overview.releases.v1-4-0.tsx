import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/releases/v1-4-0/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-4-0')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'v1.4.0' },
      {
        name: 'description',
        content: metadata.description ?? 'v1.4.0 release notes. Apr 13, 2026.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
