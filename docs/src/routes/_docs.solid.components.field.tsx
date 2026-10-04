import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/field/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/field')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Field · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid field component that provides labeling and validation for form controls.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
