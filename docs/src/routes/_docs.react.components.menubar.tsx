// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/menubar/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/menubar')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Menubar · Base UI · Solid' },
      {
        name: 'description',
        content: 'A menu bar providing commands and options for your application.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
