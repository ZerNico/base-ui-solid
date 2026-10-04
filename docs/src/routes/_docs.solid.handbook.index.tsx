import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/handbook/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/handbook/')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Handbook' }, { name: 'description', content: 'Handbook' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
