import { Meter } from '..';
import { render, describeConformance } from '#test-utils';

describe('<Meter.Track />', () => {
  describeConformance(Meter.Track, {
    wrap: (node) => <Meter.Root value={30}>{node()}</Meter.Root>,
    refInstanceof: window.HTMLDivElement,
  });
});
