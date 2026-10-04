import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/community/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/community')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Community' }, { name: 'description', content: 'Community' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
