/* Port note: Vite source imports replace the upstream demo loader. */
/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import CssModulesSource0 from './css-modules/index.module.css?highlight';
import CssModulesSource1 from './css-modules/index.tsx?highlight';

export const DemoCheckboxGroupParent = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.module.css': CssModulesSource0, 'index.tsx': CssModulesSource1 },
  },
]);
