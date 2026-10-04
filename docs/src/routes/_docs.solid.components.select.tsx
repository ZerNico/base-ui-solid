// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/select/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/select')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Select · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid select component for choosing a predefined value in a dropdown menu.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
