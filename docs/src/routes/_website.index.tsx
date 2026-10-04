import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(website)/page';

export const Route = createFileRoute('/_website/')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Base UI Solid' }, { name: 'description', content: '' }],
  }),
  component: Content,
});
