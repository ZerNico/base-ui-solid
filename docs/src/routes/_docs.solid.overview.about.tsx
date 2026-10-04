import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/overview/about/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/overview/about')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'About Base\u00a0UI Solid' },
      { name: 'description', content: 'About Base\u00a0UI Solid' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
