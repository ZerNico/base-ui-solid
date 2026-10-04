import { describe } from 'vitest';
import { createRenderer, describeConformance } from '#test-utils';
import { Popover } from '..';

describe('<Popover.Portal />', () => {
  createRenderer();

  describeConformance(Popover.Portal, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Popover.Root open>{node()}</Popover.Root>,
  });
});
