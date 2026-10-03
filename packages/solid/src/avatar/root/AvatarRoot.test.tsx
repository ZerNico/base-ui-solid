import { Avatar } from '..';
import { describeConformance } from '#test-utils';

describe('<Avatar.Root />', () => {
  describeConformance(Avatar.Root, {
    refInstanceof: window.HTMLSpanElement,
  });
});
