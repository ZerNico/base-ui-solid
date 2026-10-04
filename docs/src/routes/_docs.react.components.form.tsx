import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/form/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/form')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Form · Base UI · Solid' },
      {
        name: 'description',
        content: 'A high-quality, unstyled Solid form component with consolidated error handling.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
