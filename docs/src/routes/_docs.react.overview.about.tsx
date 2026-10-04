import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/about/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/about')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'About Base\u00a0UI' },
      { name: 'description', content: metadata.description ?? 'About Base\u00a0UI' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
