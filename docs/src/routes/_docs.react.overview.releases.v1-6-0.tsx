import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/releases/v1-6-0/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-6-0')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v1.6.0' },
      {
        name: 'description',
        content: 'v1.6.0 release notes. Jun 18, 2026.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
