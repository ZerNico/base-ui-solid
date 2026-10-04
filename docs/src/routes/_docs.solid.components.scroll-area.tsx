// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/scroll-area/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/scroll-area')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Scroll Area · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid scroll area that provides a native scroll container with custom scrollbars.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
