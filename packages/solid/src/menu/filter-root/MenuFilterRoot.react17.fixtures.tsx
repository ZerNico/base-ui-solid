import { Menu } from 'base-ui-solid/menu';

export function ServerFixture1() {
  return (
    <Menu.FilterProvider>
      <Menu.Root defaultOpen>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Portal keepMounted>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Input aria-label="Filter actions" />
              <Menu.List>
                <Menu.Item>Rename</Menu.Item>
              </Menu.List>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </Menu.FilterProvider>
  );
}
export function ServerFixture2() {
  return (
    <Menu.FilterProvider>
      <Menu.Root defaultOpen>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Portal keepMounted>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Input aria-label="Filter actions" />
              <Menu.List>
                <Menu.FilterProvider>
                  <Menu.SubmenuRoot>
                    <Menu.SubmenuTrigger>More actions</Menu.SubmenuTrigger>
                    <Menu.Portal keepMounted>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Input aria-label="Filter more actions" />
                          <Menu.List>
                            <Menu.Item>Share</Menu.Item>
                          </Menu.List>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.SubmenuRoot>
                </Menu.FilterProvider>
              </Menu.List>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </Menu.FilterProvider>
  );
}
