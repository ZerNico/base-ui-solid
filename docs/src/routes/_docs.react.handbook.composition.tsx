import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/handbook/composition/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/handbook/composition')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Composition' },
      { name: 'description', content: metadata.description ?? 'Composition' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
