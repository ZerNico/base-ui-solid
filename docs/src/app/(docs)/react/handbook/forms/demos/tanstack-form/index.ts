/* Port note: Vite highlight imports supply a default export even for named-export helper modules. */
/* eslint-disable import/extensions, import/no-duplicates, import/default */
import { createDemoWithVariants } from '../../../../../../../utils/createDemo';
import Variant1 from './tailwind';
import source1_0 from './tailwind/index.tsx?highlight';

import helperSource0 from '../components/slider.tsx?highlight';
import helperSource1 from '../components/radio.tsx?highlight';
import helperSource2 from '../components/field.tsx?highlight';
import helperSource3 from '../components/combobox.tsx?highlight';
import helperSource4 from '../components/switch.tsx?highlight';
import helperSource5 from '../components/radio-group.tsx?highlight';
import helperSource6 from '../components/checkbox-group.tsx?highlight';
import helperSource7 from '../components/number-field.tsx?highlight';
import helperSource8 from '../components/button.tsx?highlight';
import helperSource9 from '../components/toast.tsx?highlight';
import helperSource10 from '../components/checkbox.tsx?highlight';
import helperSource11 from '../components/fieldset.tsx?highlight';
import helperSource12 from '../components/select.tsx?highlight';
import helperSource13 from '../components/autocomplete.tsx?highlight';
import helperSource14 from '../components/form.tsx?highlight';
import helperSource15 from '../solid-controller.tsx?highlight';

export const DemoTanstackForm = createDemoWithVariants([
  {
    name: 'Tailwind',
    component: Variant1,
    files: {
      'index.tsx': source1_0,
      '../components/slider.tsx': helperSource0,
      '../components/radio.tsx': helperSource1,
      '../components/field.tsx': helperSource2,
      '../components/combobox.tsx': helperSource3,
      '../components/switch.tsx': helperSource4,
      '../components/radio-group.tsx': helperSource5,
      '../components/checkbox-group.tsx': helperSource6,
      '../components/number-field.tsx': helperSource7,
      '../components/button.tsx': helperSource8,
      '../components/toast.tsx': helperSource9,
      '../components/checkbox.tsx': helperSource10,
      '../components/fieldset.tsx': helperSource11,
      '../components/select.tsx': helperSource12,
      '../components/autocomplete.tsx': helperSource13,
      '../components/form.tsx': helperSource14,
      '../solid-controller.tsx': helperSource15,
    },
  },
]);
