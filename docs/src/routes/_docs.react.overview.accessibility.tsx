import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/overview/accessibility/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/accessibility')({
  head: () => ({
    meta: [
      { title: metadata.title ?? 'Accessibility' },
      { name: 'description', content: metadata.description ?? 'Accessibility' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
