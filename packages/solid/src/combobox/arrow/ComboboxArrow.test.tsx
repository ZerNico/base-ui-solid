import { describe } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { describeConformance } from '#test-utils';

describe('<Combobox.Arrow />', () => {
  describeConformance(Combobox.Arrow, {
    refInstanceof: window.HTMLDivElement,
    wrap(node) {
      return (
        <Combobox.Root defaultOpen>
          <Combobox.Portal>
            <Combobox.Positioner>{node()}</Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      );
    },
  });
});
