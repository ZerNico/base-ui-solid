// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(docs)/react/components/navigation-menu/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/navigation-menu')({
  head: () => ({
    meta: [{ title: metadata.title }, { name: 'description', content: metadata.description }],
  }),
  component: () => <Content components={mdxComponents} />,
});
