import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/handbook/animation/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/handbook/animation')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Animation' },
      {
        name: 'description',
        content: metadata.description ?? 'A guide to animating Base\u00a0UI components.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
