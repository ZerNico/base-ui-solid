import { describe } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance } from '#test-utils';

describe('<Select.Label />', () => {
  describeConformance(Select.Label, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Select.Root>
        {node()}
        <Select.Trigger />
        <Select.Portal>
          <Select.Positioner />
        </Select.Portal>
      </Select.Root>
    ),
  });
});
