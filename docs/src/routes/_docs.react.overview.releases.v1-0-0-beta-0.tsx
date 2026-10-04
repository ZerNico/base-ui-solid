import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/releases/v1-0-0-beta-0/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-0-0-beta-0')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v1.0.0-beta.0' },
      {
        name: 'description',
        content: 'v1.0.0-beta.0 release notes. May 29, 2025.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
