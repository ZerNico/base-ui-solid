// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/number-field/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/number-field')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Number Field · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid number field component with increment and decrement buttons, and a scrub area.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
