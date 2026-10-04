import { describe } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance } from '#test-utils';

describe('<Select.Portal />', () => {
  describeConformance(Select.Portal, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Select.Root open>{node()}</Select.Root>,
  });
});
