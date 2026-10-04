import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/components/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/')({
  head: () => ({ meta: [{ title: metadata.title ?? 'Components' }] }),
  component: () => <Content components={mdxComponents} />,
});
