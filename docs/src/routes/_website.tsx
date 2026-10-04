import { createFileRoute, Outlet } from '@tanstack/solid-router';
// Port note: upstream (website) is a pathless layout in Solid Router.
export const Route = createFileRoute('/_website')({ component: Outlet });
