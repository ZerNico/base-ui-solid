import { createFileRoute } from '@tanstack/solid-router';
import { DemoCollapsibleHero } from '../app/(docs)/solid/components/collapsible/demos/hero';
// Port note: private demo smoke surface mirrors upstream's /playground URL.
export const Route = createFileRoute('/_private/playground')({ component: DemoCollapsibleHero });
