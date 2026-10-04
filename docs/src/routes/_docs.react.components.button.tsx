import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/button/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/button')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Button · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid button component that can be rendered as another tag or focusable when disabled.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
