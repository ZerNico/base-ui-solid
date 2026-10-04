import { describe } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance } from '#test-utils';

describe('<Select.List />', () => {
  describeConformance(Select.List, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Select.Root open>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>{node()}</Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ),
  });
});
