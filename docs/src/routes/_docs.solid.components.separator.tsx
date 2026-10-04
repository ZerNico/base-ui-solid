// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/separator/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/separator')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Separator · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid separator component that is accessible to screen readers.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
