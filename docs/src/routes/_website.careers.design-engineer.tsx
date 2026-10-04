import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(website)/careers/design-engineer/page';

export const Route = createFileRoute('/_website/careers/design-engineer')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [{ title: 'Design Engineer · Base UI' }, { name: 'description', content: '' }],
  }),
  component: Content,
});
