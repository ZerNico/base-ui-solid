import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/utils/direction-provider/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/utils/direction-provider')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Direction Provider' },
      { name: 'description', content: metadata.description ?? 'Direction Provider' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
