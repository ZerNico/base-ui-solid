import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Overview' },
      { name: 'description', content: metadata.description ?? 'Overview' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
