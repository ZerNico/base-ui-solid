import { describe } from 'vitest';
import { createRenderer, describeConformance, viewportConformanceTests } from '#test-utils';
import { Popover } from '..';

describe('<Popover.Viewport />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Viewport, {
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

  viewportConformanceTests({
    render,
    openOn: 'click',
    createComponent: (props) => (
      <Popover.Root {...props.root}>
        {({ payload }) => (
          <>
            {props.triggers.map((trigger) => (
              <Popover.Trigger {...trigger} />
            ))}
            <Popover.Portal {...props.portal}>
              <Popover.Positioner {...props.positioner}>
                <Popover.Popup {...props.popup}>
                  <Popover.Viewport {...props.viewport}>
                    {props.renderContent(payload)}
                  </Popover.Viewport>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </>
        )}
      </Popover.Root>
    ),
  });
});
