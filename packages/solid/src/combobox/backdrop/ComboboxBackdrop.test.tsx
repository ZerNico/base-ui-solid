import { describe } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { describeConformance } from '#test-utils';

describe('<Combobox.Backdrop />', () => {
  describeConformance(Combobox.Backdrop, {
    refInstanceof: window.HTMLDivElement,
    wrap(node) {
      return (
        <Combobox.Root defaultOpen>
          <Combobox.Portal>{node()}</Combobox.Portal>
        </Combobox.Root>
      );
    },
  });
});
