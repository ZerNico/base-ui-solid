// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/tooltip/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/tooltip')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Tooltip · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid tooltip component that appears when an element is hovered or focused, showing a hint for sighted users.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
