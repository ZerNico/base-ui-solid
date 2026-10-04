/* Port note: Vite source imports replace the upstream demo loader. */
/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import CssModulesSource0 from './css-modules/index.tsx?highlight';
import Tailwind from './tailwind';
import TailwindSource0 from './tailwind/index.tsx?highlight';

import SupportingSource0 from '../_index.module.css?highlight';

export const DemoAccordionHero = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { '_index.module.css': SupportingSource0, 'index.tsx': CssModulesSource0 },
  },
  {
    name: 'Tailwind',
    component: Tailwind,
    files: { '_index.module.css': SupportingSource0, 'index.tsx': TailwindSource0 },
  },
]);
