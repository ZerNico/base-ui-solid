/* Port note: source imports mirror each live Solid variant and its supporting files. */
/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import source0 from './css-modules/index.tsx?highlight';
import source1 from './../index.module.css?highlight';
import Tailwind from './tailwind';
import source2 from './tailwind/index.tsx?highlight';

export const DemoPreviewCardDetachedTriggersSimple = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.tsx': source0, '../../index.module.css': source1 },
  },
  { name: 'Tailwind', component: Tailwind, files: { 'index.tsx': source2 } },
]);
