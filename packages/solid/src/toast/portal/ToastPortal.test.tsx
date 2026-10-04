import { describe } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { describeConformance } from '#test-utils';

describe('<Toast.Portal />', () => {
  describeConformance(Toast.Portal, {
    refInstanceof: window.HTMLDivElement,
  });
});
