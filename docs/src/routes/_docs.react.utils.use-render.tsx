import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/utils/use-render/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/utils/use-render')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'useRender' },
      {
        name: 'description',
        content: 'Hook for enabling a render prop in custom components.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
