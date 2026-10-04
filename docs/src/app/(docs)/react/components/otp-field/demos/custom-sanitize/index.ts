/* eslint-disable import/extensions, import/no-duplicates, import/default */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import source0 from './css-modules/index.tsx?highlight';
import source1 from './useInvalidFeedback.ts?highlight';
import source2 from './css-modules/index.module.css?highlight';

export const DemoOTPFieldCustomNormalize = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.tsx': source0, 'useInvalidFeedback.ts': source1, 'index.module.css': source2 },
  },
]);
