import { createFileRoute } from '@tanstack/solid-router';
import Content, { metadata } from '../app/(website)/page';

export const Route = createFileRoute('/_website/')({
  head: () => ({
    meta: [{ title: 'Base UI for Solid' }, { name: 'description', content: metadata.description }],
  }),
  component: Content,
});
