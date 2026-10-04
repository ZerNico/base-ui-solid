import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/utils/merge-props/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/utils/merge-props')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'mergeProps' }, { name: 'description', content: 'mergeProps' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
