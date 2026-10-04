/* Port note: Vite source imports replace the upstream demo loader. */
/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import CssModulesSource0 from './css-modules/index.module.css?highlight';
import CssModulesSource1 from './css-modules/index.tsx?highlight';
import Tailwind from './tailwind';
import TailwindSource0 from './tailwind/index.tsx?highlight';

export const DemoAlertDialogOpenFromMenu = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.module.css': CssModulesSource0, 'index.tsx': CssModulesSource1 },
  },
  { name: 'Tailwind', component: Tailwind, files: { 'index.tsx': TailwindSource0 } },
]);
