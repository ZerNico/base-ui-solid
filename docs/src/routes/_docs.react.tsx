import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Solid' },
      { name: 'description', content: metadata.description ?? 'Solid' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
