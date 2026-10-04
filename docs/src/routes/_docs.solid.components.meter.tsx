// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/meter/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/meter')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Meter · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid meter component that provides a graphical display of a numeric value.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
