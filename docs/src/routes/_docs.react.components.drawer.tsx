import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/drawer/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/drawer')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Drawer · Base UI · Solid' },
      {
        name: 'description',
        content: 'A high-quality, unstyled Solid drawer component with swipe-to-dismiss gestures.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
