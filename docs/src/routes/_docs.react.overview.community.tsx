import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/community/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/community')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Community' },
      { name: 'description', content: metadata.description ?? 'Community' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
