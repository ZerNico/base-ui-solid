import { Progress } from '..';
import { render, describeConformance } from '#test-utils';

describe('<Progress.Track />', () => {
  describeConformance(Progress.Track, {
    wrap: (node) => <Progress.Root value={40}>{node()}</Progress.Root>,
    refInstanceof: window.HTMLDivElement,
  });
});
