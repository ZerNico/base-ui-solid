import { describe } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance } from '#test-utils';

describe('<Select.Backdrop />', () => {
  describeConformance(Select.Backdrop, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Select.Root open>{node()}</Select.Root>,
  });
});
