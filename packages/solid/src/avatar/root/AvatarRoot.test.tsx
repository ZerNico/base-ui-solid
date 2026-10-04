import { describe } from 'vitest';
import { describeConformance } from '#test-utils';
import { Avatar } from '..';

describe('<Avatar.Root />', () => {
  describeConformance(Avatar.Root, {
    refInstanceof: window.HTMLSpanElement,
  });
});
