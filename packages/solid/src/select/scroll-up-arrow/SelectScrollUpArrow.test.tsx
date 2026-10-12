import { describe } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance } from '#test-utils';

describe('<Select.ScrollUpArrow />', () => {
  describeConformance(
    (props: Select.ScrollUpArrow.Props) => <Select.ScrollUpArrow keepMounted {...props} />,
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
