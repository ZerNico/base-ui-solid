import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({ meta: [{ title: 'Components' }] }),
  component: () => <Content components={mdxComponents} />,
});
