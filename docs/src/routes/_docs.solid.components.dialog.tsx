import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/dialog/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/dialog')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Dialog · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid dialog component that opens on top of the entire page.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
