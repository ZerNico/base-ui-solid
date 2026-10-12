import type { JSX } from '@solidjs/web';

import { describe } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { createRenderer as createBaseRenderer, viewportConformanceTests } from '#test-utils';
import { createRenderer } from '../../../test/menuPortHelpers';

import { describeMenuConformance } from '../../../test/menuConformance';

describe('<Menu.Viewport />', () => {
  const { render } = createRenderer();
  describeMenuConformance(Menu.Viewport, {
    refInstanceof: window.HTMLDivElement,
    render: (node: () => JSX.Element) => {
      return render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Trigger>Trigger</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>{node()}</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
    },
  });

  viewportConformanceTests({
    render: createBaseRenderer().render,
    openOn: 'click',
    createComponent: (props) => (
      <Menu.Root {...props.root}>
        {({ payload }) => (
          <>
            {props.triggers.map((trigger) => (
              <Menu.Trigger {...trigger} />
            ))}
            <Menu.Portal {...props.portal}>
              <Menu.Positioner {...props.positioner}>
                <Menu.Popup {...props.popup}>
                  <Menu.Viewport {...props.viewport}>{props.renderContent(payload)}</Menu.Viewport>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </>
        )}
      </Menu.Root>
    ),
  });
});
