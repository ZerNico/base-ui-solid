import { createFileRoute, Outlet } from '@tanstack/solid-router';

// Port note: index content must not mask nested documentation routes.
export const Route = createFileRoute('/_docs/solid/overview/releases')({
  component: Outlet,
});
