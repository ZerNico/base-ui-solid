import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/utils/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/utils/')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Utils' }, { name: 'description', content: 'Utils' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
