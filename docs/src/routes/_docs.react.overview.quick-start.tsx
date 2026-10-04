import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/quick-start/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/quick-start')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Quick start' },
      {
        name: 'description',
        content: 'A quick guide to getting started with Base\u00a0UI.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
