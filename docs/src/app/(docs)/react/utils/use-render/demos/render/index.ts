/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import Variant0 from './css-modules';
import source0_0 from './css-modules/index.module.css?highlight';
import source0_1 from './css-modules/index.tsx?highlight';

export const DemoUseRenderRender = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: Variant0,
    files: { 'index.tsx': source0_1, 'index.module.css': source0_0 },
  },
]);
