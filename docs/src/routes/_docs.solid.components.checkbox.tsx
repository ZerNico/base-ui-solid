import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/checkbox/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/checkbox')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Checkbox · Base UI · Solid' },
      {
        name: 'description',
        content: 'A high-quality, unstyled Solid checkbox component that is easy to customize.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
