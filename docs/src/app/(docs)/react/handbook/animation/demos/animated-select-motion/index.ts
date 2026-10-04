/* Port note: Vite highlight imports supply a default export even for named-export helper modules. */
/* eslint-disable import/extensions, import/no-duplicates, import/default */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import Variant0 from './css-modules';
import source0_0 from './css-modules/index.module.css?highlight';
import source0_1 from './css-modules/index.tsx?highlight';

import helperSource0 from '../animated-popup.tsx?highlight';

export const DemoAnimatedSelectMotion = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: Variant0,
    files: {
      'index.module.css': source0_0,
      'index.tsx': source0_1,
      '../animated-popup.tsx': helperSource0,
    },
  },
]);
