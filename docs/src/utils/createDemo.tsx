import { Demo } from '../components/Demo/Demo';
import type { DemoVariant } from '../components/Demo/Demo';

// Port note: docs-infra's `extractNameAndSlugFromUrl`, for the demo folder names.
function kebabToTitleCase(value: string) {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Port note: Vite raw imports replace Next.js's precomputed demo loader; source and live
// components share exactly the same files, including CSS Modules/Tailwind variants.
// Upstream passes the demo's `import.meta.url`, which Vite rewrites to the bundled chunk. The
// URL is derived from the path of the first variant's entry file instead (`<demo>/<variant>/index.tsx`).
export function createDemoWithVariants(variants: DemoVariant[]) {
  const entryPath = variants[0]?.files['index.tsx']?.path;
  const demoPath = entryPath?.split('/').slice(0, -2).join('/');
  const url = demoPath ? `file:///${demoPath}/index.ts` : undefined;
  const name = demoPath ? kebabToTitleCase(demoPath.split('/').pop() ?? '') : undefined;
  return () => <Demo variants={variants} url={url} name={name} />;
}
