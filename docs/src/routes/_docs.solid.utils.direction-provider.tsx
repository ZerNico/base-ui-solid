import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/utils/direction-provider/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/utils/direction-provider')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Direction Provider' }, { name: 'description', content: 'Direction Provider' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
