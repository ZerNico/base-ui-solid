import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/components/checkbox-group/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/checkbox-group')({
  head: () => ({
    meta: [{ title: metadata.title }, { name: 'description', content: metadata.description }],
  }),
  component: () => <Content components={mdxComponents} />,
});
