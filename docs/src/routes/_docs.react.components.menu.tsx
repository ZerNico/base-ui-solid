// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/menu/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/menu')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Menu · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid menu component that displays list of actions in a dropdown, enhanced with keyboard navigation.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
