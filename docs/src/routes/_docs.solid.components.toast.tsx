// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/toast/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/toast')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Toast · Base UI Solid' },
      {
        name: 'description',
        content: 'A high-quality, unstyled Solid toast component to generate notifications.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
