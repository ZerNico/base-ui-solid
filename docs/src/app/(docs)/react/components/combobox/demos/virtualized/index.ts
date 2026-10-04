/* eslint-disable import/extensions, import/no-duplicates, import/default */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import CssModulesSource0 from './css-modules/index.module.css?highlight';
import CssModulesSource1 from './css-modules/index.tsx?highlight';
import Tailwind from './tailwind';
import TailwindSource0 from './tailwind/index.tsx?highlight';

import SupportingSource0 from './useVirtualizer.ts?highlight';

export const DemoComboboxVirtualized = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: {
      'index.tsx': CssModulesSource1,
      'useVirtualizer.ts': SupportingSource0,
      'index.module.css': CssModulesSource0,
    },
  },
  {
    name: 'Tailwind',
    component: Tailwind,
    files: { 'index.tsx': TailwindSource0, 'useVirtualizer.ts': SupportingSource0 },
  },
]);
