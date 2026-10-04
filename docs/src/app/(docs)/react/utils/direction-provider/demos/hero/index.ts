/* Port note: Vite imports share live Solid demos and displayed sources. */
/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import Variant0 from './css-modules';
import source0_0 from './css-modules/index.module.css?highlight';
import source0_1 from './css-modules/index.tsx?highlight';
import Variant1 from './tailwind';
import source1_0 from './tailwind/index.tsx?highlight';

export const DemoDirectionProviderHero = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: Variant0,
    files: { 'index.module.css': source0_0, 'index.tsx': source0_1 },
  },
  { name: 'Tailwind', component: Variant1, files: { 'index.tsx': source1_0 } },
]);
