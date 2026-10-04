// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/slider/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/slider')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Slider · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid slider component that works like a range input and is easy to style.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
