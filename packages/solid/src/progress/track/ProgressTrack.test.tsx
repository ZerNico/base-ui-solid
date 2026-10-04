import { describe } from 'vitest';
import { describeConformance } from '#test-utils';
import { Progress } from '..';

describe('<Progress.Track />', () => {
  describeConformance(Progress.Track, {
    wrap: (node) => <Progress.Root value={40}>{node()}</Progress.Root>,
    refInstanceof: window.HTMLDivElement,
  });
});
