import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/releases/v1-0-0-alpha-8/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/releases/v1-0-0-alpha-8')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'v1.0.0-alpha.8' },
      {
        name: 'description',
        content: 'v1.0.0-alpha.8 release notes. Apr 17, 2025.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
