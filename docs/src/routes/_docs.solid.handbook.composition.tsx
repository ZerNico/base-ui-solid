import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/handbook/composition/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/handbook/composition')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Composition' }, { name: 'description', content: 'Composition' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
