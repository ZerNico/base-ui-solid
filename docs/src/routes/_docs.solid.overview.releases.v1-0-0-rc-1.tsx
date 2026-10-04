import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/overview/releases/v1-0-0-rc-1/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/overview/releases/v1-0-0-rc-1')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v1.0.0-rc.1' },
      {
        name: 'description',
        content: 'v1.0.0-rc.1 release notes. Dec 11, 2025.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
