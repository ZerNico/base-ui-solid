import { Menu } from 'base-ui-solid/menu';

export function ServerFixture1() {
  return (
    <Menu.FilterProvider>
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Input aria-label="Filter actions" />
              <Menu.Empty data-testid="empty">No actions found</Menu.Empty>
              <Menu.List />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </Menu.FilterProvider>
  );
}
