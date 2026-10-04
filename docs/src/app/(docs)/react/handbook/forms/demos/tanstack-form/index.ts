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
      'solid-controller.tsx': helperSource15,
      'button.tsx': helperSource8,
      'checkbox-group.tsx': helperSource6,
      'radio-group.tsx': helperSource5,
      'toast.tsx': helperSource9,
      'autocomplete.tsx': helperSource13,
      'checkbox.tsx': helperSource10,
      'combobox.tsx': helperSource3,
      'field.tsx': helperSource2,
      'fieldset.tsx': helperSource11,
      'number-field.tsx': helperSource7,
      'radio.tsx': helperSource1,
      'select.tsx': helperSource12,
      'slider.tsx': helperSource0,
      'switch.tsx': helperSource4,
      'form.tsx': helperSource14,
    },
  },
]);
