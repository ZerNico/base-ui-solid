import { describe } from 'vitest';
import { describeConformance } from '#test-utils';
import { Meter } from '..';

describe('<Meter.Track />', () => {
  describeConformance(Meter.Track, {
    wrap: (node) => <Meter.Root value={30}>{node()}</Meter.Root>,
    refInstanceof: window.HTMLDivElement,
  });
});
