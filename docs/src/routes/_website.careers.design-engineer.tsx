import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(website)/careers/design-engineer/page';

export const Route = createFileRoute('/_website/careers/design-engineer')({
  head: () => ({
    meta: [
      { title: 'Design Engineer · Base UI' },
      { name: 'description', content: metadata.description },
    ],
  }),
  component: Content,
});
