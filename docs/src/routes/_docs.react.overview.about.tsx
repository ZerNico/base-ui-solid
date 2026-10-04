import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/about/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/about')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'About Base\u00a0UI' }, { name: 'description', content: 'About Base\u00a0UI' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
