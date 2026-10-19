import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/overview/releases/v0-3-1/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/overview/releases/v0-3-1')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v0.3.1' },
      { name: 'description', content: 'v0.3.1 release notes. Oct 19, 2026.' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
