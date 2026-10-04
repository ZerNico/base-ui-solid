/* Port note: source imports mirror each live Solid variant and its supporting files. */
/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import source0 from './css-modules/index.tsx?highlight';
// Port note: the highlight loader supplies a default source tree for named-export modules.
// eslint-disable-next-line import/default
import source1 from './data.ts?highlight';
import source2 from './css-modules/index.module.css?highlight';
import Tailwind from './tailwind';
import source3 from './tailwind/index.tsx?highlight';
// Port note: the highlight loader supplies a default source tree for named-export modules.
// eslint-disable-next-line import/default
import source4 from './data.ts?highlight';

export const DemoNavigationMenuNestedInline = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.tsx': source0, '../data.ts': source1, 'index.module.css': source2 },
  },
  { name: 'Tailwind', component: Tailwind, files: { 'index.tsx': source3, '../data.ts': source4 } },
]);
