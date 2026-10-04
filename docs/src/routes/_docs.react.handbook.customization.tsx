import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/handbook/customization/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/handbook/customization')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Customization' },
      {
        name: 'description',
        content: 'A guide to customizing the behavior of Base\u00a0UI components.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
