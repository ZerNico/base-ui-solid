// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/popover/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/popover')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Popover · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid popover component that displays an accessible popup anchored to a button.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
