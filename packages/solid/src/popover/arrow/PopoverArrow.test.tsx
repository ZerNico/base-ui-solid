import { describe } from 'vitest';
import { createRenderer, describeConformance } from '#test-utils';
import { Popover } from '..';

describe('<Popover.Arrow />', () => {
  createRenderer();

  describeConformance(Popover.Arrow, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>{node()}</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ),
  });
});
