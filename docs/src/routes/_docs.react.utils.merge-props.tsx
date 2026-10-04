import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/utils/merge-props/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/utils/merge-props')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'mergeProps' },
      { name: 'description', content: metadata.description ?? 'mergeProps' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
