import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/production-error/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/production-error')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Production error #<ErrorCode />' },
      { name: 'description', content: metadata.description ?? 'Production error #<ErrorCode />' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
