import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/react/components/fieldset/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/react/components/fieldset')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'Fieldset · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid fieldset component with an easily stylable legend.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});
