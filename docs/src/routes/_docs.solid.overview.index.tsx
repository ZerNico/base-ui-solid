import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/overview/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/overview/')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Overview' }, { name: 'description', content: 'Overview' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
