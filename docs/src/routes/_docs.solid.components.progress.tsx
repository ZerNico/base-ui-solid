// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/progress/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/progress')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Progress · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid progress bar component that displays the status of a task that takes a long time.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
