import { createRenderer, describeConformance, screen } from '#test-utils';
import { Drawer } from 'base-ui-solid/drawer';
import { describe, expect, it } from 'vitest';

describe('<Drawer.Content />', () => {
  const { render } = createRenderer();
  describeConformance(Drawer.Content, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Drawer.Root open>
        <Drawer.Portal>
          <Drawer.Viewport>
            <Drawer.Popup>{node()}</Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    ),
  });
  it('does not add public swipe-ignore attributes', async () => {
    await render((overrides) => (
      <Drawer.Root open {...overrides()}>
        <Drawer.Portal>
          <Drawer.Viewport>
            <Drawer.Popup>
              <Drawer.Content data-testid="content">Content</Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    ));
    expect(screen.getByTestId('content')).not.toHaveAttribute('data-swipe-ignore');
    expect(screen.getByTestId('content')).not.toHaveAttribute('data-base-ui-swipe-ignore');
  });
});
