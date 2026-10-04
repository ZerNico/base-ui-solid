// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/toolbar/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/toolbar')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Toolbar · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid toolbar component that groups a set of buttons and controls.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
