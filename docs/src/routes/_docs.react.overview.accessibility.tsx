import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/overview/accessibility/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/overview/accessibility')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Accessibility' }, { name: 'description', content: 'Accessibility' }],
  }),
  component: () => <Content components={mdxComponents} />,
});
