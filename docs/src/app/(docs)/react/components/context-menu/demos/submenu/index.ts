/* Port note: live variants and displayed source share the Solid files. */
/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import Tailwind from './tailwind';
import cssSource from './css-modules/index.tsx?highlight';
import tailwindSource from './tailwind/index.tsx?highlight';
import stylesSource from './css-modules/index.module.css?highlight';

export const DemoContextMenuSubmenu = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.tsx': cssSource, 'index.module.css': stylesSource },
  },
  { name: 'Tailwind', component: Tailwind, files: { 'index.tsx': tailwindSource } },
]);
