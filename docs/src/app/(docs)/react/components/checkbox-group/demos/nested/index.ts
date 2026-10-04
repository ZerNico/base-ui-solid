/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import CssModulesSource0 from './css-modules/index.module.css?highlight';
import CssModulesSource1 from './css-modules/index.tsx?highlight';

export const DemoCheckboxGroupNested = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.tsx': CssModulesSource1, 'index.module.css': CssModulesSource0 },
  },
]);
