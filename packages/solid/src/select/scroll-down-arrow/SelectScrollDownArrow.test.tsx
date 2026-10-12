import { describe } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance } from '#test-utils';

describe('<Select.ScrollDownArrow />', () => {
  describeConformance(
    (props: Select.ScrollDownArrow.Props) => <Select.ScrollDownArrow keepMounted {...props} />,
    {
      refInstanceof: window.HTMLDivElement,
      wrap: (node) => (
        <Select.Root open>
          <Select.Positioner>{node()}</Select.Positioner>
        </Select.Root>
      ),
    },
  );
});
