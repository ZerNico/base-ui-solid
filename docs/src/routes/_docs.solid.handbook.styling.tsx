import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/handbook/styling/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/handbook/styling')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Styling' }, { name: 'description', content: 'Styling' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
