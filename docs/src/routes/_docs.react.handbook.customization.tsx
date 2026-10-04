import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/handbook/customization/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/handbook/customization')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Customization' },
      {
        name: 'description',
        content:
          metadata.description ?? 'A guide to customizing the behavior of Base\u00a0UI components.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
