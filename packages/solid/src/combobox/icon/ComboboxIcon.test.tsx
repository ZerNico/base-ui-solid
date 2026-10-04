import { describe } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { describeConformance } from '#test-utils';

describe('<Combobox.Icon />', () => {
  describeConformance(Combobox.Icon, {
    refInstanceof: window.HTMLSpanElement,
    wrap(node) {
      return <Combobox.Root open>{node()}</Combobox.Root>;
    },
  });
});
