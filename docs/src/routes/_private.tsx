import { createFileRoute, Outlet } from '@tanstack/solid-router';
// Port note: upstream (private) is a pathless layout in Solid Router.
export const Route = createFileRoute('/_private')({ component: Outlet });
