import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/utils/use-render/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/utils/use-render')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'useRender' },
      {
        name: 'description',
        content: metadata.description ?? 'Hook for enabling a render prop in custom components.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
