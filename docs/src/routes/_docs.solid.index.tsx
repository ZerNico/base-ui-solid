import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Solid' }, { name: 'description', content: 'Solid' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
