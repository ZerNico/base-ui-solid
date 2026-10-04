import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/collapsible/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/collapsible')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Collapsible · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid collapsible component that displays a panel controlled by a button.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
