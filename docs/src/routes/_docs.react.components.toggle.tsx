// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/toggle/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/toggle')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Toggle · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid toggle component that displays a two-state button that can be on or off.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
