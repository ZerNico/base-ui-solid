import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/checkbox-group/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/checkbox-group')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Checkbox Group · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid checkbox group component that provides a shared state for a series of checkboxes.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
