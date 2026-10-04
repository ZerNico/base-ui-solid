import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/overview/releases/v1-0-0-beta-4/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/overview/releases/v1-0-0-beta-4')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v1.0.0-beta.4' },
      {
        name: 'description',
        content: 'v1.0.0-beta.4 release notes. Oct 1, 2025.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
