import { expect, describe, it } from 'vitest';
import { createRenderer, describeConformance, screen } from '#test-utils';
import { Popover } from '..';

describe('<Popover.Title />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Title, {
    refInstanceof: window.HTMLHeadingElement,
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

  it('labels the popup element with its id', async () => {
    await render(() => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Popover.Title>Title</Popover.Title>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    const id = document.querySelector('h2')?.id;
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', id);
  });
});
