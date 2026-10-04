import { createFileRoute, Outlet } from '@tanstack/solid-router';
import { DocsLayout } from '../components/DocsLayout';

export const Route = createFileRoute('/_docs')({
  component: () => (
    <DocsLayout>
      <Outlet />
    </DocsLayout>
  ),
});
