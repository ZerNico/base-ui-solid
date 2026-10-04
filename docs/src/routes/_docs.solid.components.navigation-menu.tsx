// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/navigation-menu/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/navigation-menu')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Navigation Menu · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid navigation menu component that displays a collection of links and menus for website navigation.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
