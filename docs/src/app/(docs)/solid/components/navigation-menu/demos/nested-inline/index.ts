/* eslint-disable import/extensions, import/no-duplicates, import/default */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import source0 from './css-modules/index.tsx?highlight';
import source1 from './data.ts?highlight';
import source2 from './css-modules/index.module.css?highlight';
import Tailwind from './tailwind';
import source3 from './tailwind/index.tsx?highlight';
import source4 from './data.ts?highlight';

export const DemoNavigationMenuNestedInline = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.tsx': source0, 'data.ts': source1, 'index.module.css': source2 },
  },
  { name: 'Tailwind', component: Tailwind, files: { 'index.tsx': source3, 'data.ts': source4 } },
]);
