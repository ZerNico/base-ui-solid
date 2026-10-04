import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/components/accordion/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/accordion')({
  head: () => ({
    meta: [{ title: metadata.title }, { name: 'description', content: metadata.description }],
  }),
  component: () => <Content components={mdxComponents} />,
});
