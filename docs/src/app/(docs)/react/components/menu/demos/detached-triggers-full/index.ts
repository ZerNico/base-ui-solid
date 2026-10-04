/* Port note: source imports mirror each live Solid variant and its supporting files. */
/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import source0 from './css-modules/index.tsx?highlight';
import source1 from './../_index.module.css?highlight';
import source2 from './css-modules/index.module.css?highlight';
import Tailwind from './tailwind';
import source3 from './tailwind/index.tsx?highlight';

export const DemoMenuDetachedTriggersFull = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: {
      'index.tsx': source0,
      '../../_index.module.css': source1,
      'index.module.css': source2,
    },
  },
  { name: 'Tailwind', component: Tailwind, files: { 'index.tsx': source3 } },
]);
