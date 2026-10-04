import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/handbook/typescript/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/handbook/typescript')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'TypeScript' },
      {
        name: 'description',
        content: metadata.description ?? 'A guide to using TypeScript with Base\u00a0UI.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
