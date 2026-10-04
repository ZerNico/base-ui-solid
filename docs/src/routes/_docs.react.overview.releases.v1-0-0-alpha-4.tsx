import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/releases/v1-0-0-alpha-4/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-0-0-alpha-4')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'v1.0.0-alpha.4' },
      {
        name: 'description',
        content: metadata.description ?? 'v1.0.0-alpha.4 release notes. Dec 17, 2024.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
