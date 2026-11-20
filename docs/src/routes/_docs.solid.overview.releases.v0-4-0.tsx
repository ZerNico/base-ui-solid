import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/overview/releases/v0-4-0/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/overview/releases/v0-4-0')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v0.4.0' },
      { name: 'description', content: 'v0.4.0 release notes. Nov 20, 2026.' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
