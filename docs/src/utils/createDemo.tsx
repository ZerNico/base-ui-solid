import { Demo } from '../components/Demo/Demo';
import type { DemoVariant } from '../components/Demo/Demo';
// Port note: Vite raw imports replace Next.js's precomputed demo loader; source and live
// components share exactly the same files, including CSS Modules/Tailwind variants.
export function createDemoWithVariants(variants: DemoVariant[]) {
  return () => <Demo variants={variants} />;
}
