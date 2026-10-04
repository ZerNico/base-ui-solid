import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/handbook/forms/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/handbook/forms')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Forms' },
      {
        name: 'description',
        content: metadata.description ?? 'A guide to building forms with Base\u00a0UI components.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
