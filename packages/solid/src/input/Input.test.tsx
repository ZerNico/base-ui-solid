import { Input } from '.';
import { describeConformance } from '#test-utils';

describe('<Input />', () => {
  describeConformance(Input, {
    refInstanceof: window.HTMLInputElement,
  });
});
