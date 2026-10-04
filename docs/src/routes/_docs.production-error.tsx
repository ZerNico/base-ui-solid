import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/production-error/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/production-error')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Production error #<ErrorCode />' },
      { name: 'description', content: 'Production error #<ErrorCode />' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
