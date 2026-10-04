import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/combobox/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/combobox')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Combobox · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid combobox component that renders an input combined with a list of predefined items to select.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
