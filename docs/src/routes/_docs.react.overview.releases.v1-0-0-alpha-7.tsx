import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/releases/v1-0-0-alpha-7/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-0-0-alpha-7')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v1.0.0-alpha.7' },
      {
        name: 'description',
        content: 'v1.0.0-alpha.7 release notes. Mar 20, 2025.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
