import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/utils/csp-provider/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/utils/csp-provider')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'CSP Provider' }, { name: 'description', content: 'CSP Provider' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
