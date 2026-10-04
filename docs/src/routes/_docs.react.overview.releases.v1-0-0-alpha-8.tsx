import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/releases/v1-0-0-alpha-8/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-0-0-alpha-8')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'v1.0.0-alpha.8' },
      {
        name: 'description',
        content: metadata.description ?? 'v1.0.0-alpha.8 release notes. Apr 17, 2025.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
