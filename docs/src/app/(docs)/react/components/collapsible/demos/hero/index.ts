/* eslint-disable import/extensions, import/no-duplicates */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import CssModules from './css-modules';
import Tailwind from './tailwind';
import cssSource from './css-modules/index.tsx?highlight';
import css from './css-modules/index.module.css?highlight';
import tailwindSource from './tailwind/index.tsx?highlight';

export const DemoCollapsibleHero = createDemoWithVariants([
  {
    name: 'CSS Modules',
    component: CssModules,
    files: { 'index.tsx': cssSource, 'index.module.css': css },
  },
  { name: 'Tailwind', component: Tailwind, files: { 'index.tsx': tailwindSource } },
]);
