// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/context-menu/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/context-menu')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Context Menu · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid context menu component that appears at the pointer on right click or long press.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
