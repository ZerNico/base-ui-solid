// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/switch/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/switch')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Switch · Base UI Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid switch component that indicates whether a setting is on or off.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
