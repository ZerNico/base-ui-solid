import { describe } from 'vitest';
import { describeConformance } from '#test-utils';
import { Slider } from '..';

describe('<Slider.Track />', () => {
  describeConformance(Slider.Track, {
    wrap: (node) => <Slider.Root>{node()}</Slider.Root>,
    refInstanceof: window.HTMLDivElement,
  });
});
