import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/handbook/styling/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/handbook/styling')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Styling' },
      { name: 'description', content: metadata.description ?? 'Styling' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
