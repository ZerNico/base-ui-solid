import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/releases/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Releases' },
      { name: 'description', content: metadata.description ?? 'Releases' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
