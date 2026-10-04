/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import CssModulesSource0 from './css-modules/index.tsx?highlight';
import Tailwind from './tailwind';
import TailwindSource0 from './tailwind/index.tsx?highlight';

import SupportingSource0 from '../_index.module.css?highlight';

export const DemoAlertDialogDetachedTriggersSimple = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.tsx': CssModulesSource0, 'index.module.css': SupportingSource0 },
  },
  {
    name: 'Tailwind',
    component: Tailwind,
    files: { 'index.tsx': TailwindSource0, 'index.module.css': SupportingSource0 },
  },
]);
