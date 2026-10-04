import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/releases/v1-0-0-beta-2/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-0-0-beta-2')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'v1.0.0-beta.2' },
      {
        name: 'description',
        content: metadata.description ?? 'v1.0.0-beta.2 release notes. Jul 30, 2025.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
