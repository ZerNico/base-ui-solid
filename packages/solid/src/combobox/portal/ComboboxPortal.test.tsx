import { describe } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { describeConformance } from '#test-utils';

describe('<Combobox.Portal />', () => {
  describeConformance(Combobox.Portal, {
    refInstanceof: window.HTMLDivElement,
    wrap(node) {
      return <Combobox.Root open>{node()}</Combobox.Root>;
    },
  });
});
