import { describe } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance } from '#test-utils';

describe('<Select.Arrow />', () => {
  describeConformance(Select.Arrow, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Select.Root open>
        <Select.Positioner alignItemWithTrigger={false}>{node()}</Select.Positioner>
      </Select.Root>
    ),
  });
});
