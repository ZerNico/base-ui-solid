import { describe } from 'vitest';
import { describeConformance } from '#test-utils';
import { Input } from '.';

describe('<Input />', () => {
  describeConformance(Input, {
    refInstanceof: window.HTMLInputElement,
  });
});
