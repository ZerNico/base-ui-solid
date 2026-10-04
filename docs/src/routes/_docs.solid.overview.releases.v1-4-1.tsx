import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/overview/releases/v1-4-1/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/overview/releases/v1-4-1')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v1.4.1' },
      {
        name: 'description',
        content: 'v1.4.1 release notes. Apr 20, 2026.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
