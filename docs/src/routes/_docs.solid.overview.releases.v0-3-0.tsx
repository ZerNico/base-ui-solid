import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/overview/releases/v0-3-0/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/overview/releases/v0-3-0')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v0.3.0' },
      { name: 'description', content: 'v0.3.0 release notes. Oct 16, 2026.' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
