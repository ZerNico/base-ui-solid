import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/input/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/input')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Input · Base UI Solid' },
      { name: 'description', content: 'A high-quality, unstyled Solid input component.' },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
