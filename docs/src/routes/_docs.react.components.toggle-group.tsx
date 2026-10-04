// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/toggle-group/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/toggle-group')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Toggle Group · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid toggle group component that provides shared state to a series of toggle buttons.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
