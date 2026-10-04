import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/releases/v1-4-0/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-4-0')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v1.4.0' },
      {
        name: 'description',
        content: 'v1.4.0 release notes. Apr 13, 2026.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
