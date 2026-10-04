import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/utils/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/utils/')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Utils' },
      { name: 'description', content: metadata.description ?? 'Utils' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
