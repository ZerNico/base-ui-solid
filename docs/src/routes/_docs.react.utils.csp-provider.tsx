import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/utils/csp-provider/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/utils/csp-provider')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'CSP Provider' },
      { name: 'description', content: metadata.description ?? 'CSP Provider' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
