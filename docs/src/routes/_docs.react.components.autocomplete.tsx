import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/autocomplete/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/autocomplete')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Autocomplete · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid autocomplete component that renders an input with a list of filtered options.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
