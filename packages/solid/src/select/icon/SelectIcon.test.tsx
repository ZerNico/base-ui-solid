import { describe } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance } from '#test-utils';

describe('<Select.Icon />', () => {
  describeConformance(Select.Icon, {
    refInstanceof: window.HTMLSpanElement,
    wrap: (node) => <Select.Root open>{node()}</Select.Root>,
  });
});
