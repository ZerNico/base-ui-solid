import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/handbook/animation/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/handbook/animation')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Animation' },
      {
        name: 'description',
        content: 'A guide to animating Base\u00a0UI components.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
