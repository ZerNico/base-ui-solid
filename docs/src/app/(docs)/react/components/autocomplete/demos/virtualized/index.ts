/* Port note: Vite source imports replace the upstream demo loader. */
/* eslint-disable import/extensions, import/no-duplicates, import/default */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import CssModulesSource0 from './css-modules/index.module.css?highlight';
import CssModulesSource1 from './css-modules/index.tsx?highlight';
import Tailwind from './tailwind';
import TailwindSource0 from './tailwind/index.tsx?highlight';

import SupportingSource0 from './useVirtualizer.ts?highlight';

export const DemoAutocompleteVirtualized = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: {
      'useVirtualizer.ts': SupportingSource0,
      'index.module.css': CssModulesSource0,
      'index.tsx': CssModulesSource1,
    },
  },
  {
    name: 'Tailwind',
    component: Tailwind,
    files: { 'useVirtualizer.ts': SupportingSource0, 'index.tsx': TailwindSource0 },
  },
]);
