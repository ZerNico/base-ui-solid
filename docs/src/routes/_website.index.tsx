import { createFileRoute, Link } from '@tanstack/solid-router';

export const Route = createFileRoute('/_website/')({
  component: () => (
    <main class="Landing">
      <h1>Base UI for Solid</h1>
      <p>Unstyled UI components for Solid 2.0.</p>
      <Link to="/react/components/collapsible">Read the documentation</Link>
    </main>
  ),
});
