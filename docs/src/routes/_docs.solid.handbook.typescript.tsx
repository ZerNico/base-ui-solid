import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/handbook/typescript/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/handbook/typescript')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'TypeScript' },
      {
        name: 'description',
        content: 'A guide to using TypeScript with Base\u00a0UI.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
