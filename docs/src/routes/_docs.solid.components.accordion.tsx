import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/accordion/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/accordion')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Accordion · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid accordion component that displays a set of collapsible panels with headings.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
