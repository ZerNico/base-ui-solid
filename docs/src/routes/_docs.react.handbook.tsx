import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/handbook/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/handbook')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Handbook' },
      { name: 'description', content: metadata.description ?? 'Handbook' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
