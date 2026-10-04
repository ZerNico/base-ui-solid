import { Menu } from 'base-ui-solid/menu';
import styles from './LinkItemNavigation.module.css';

export default function MenuLinkItemNavigation() {
  return (
    <div class={styles.Page}>
      <h1 data-testid="page-heading" class={styles.Heading}>
        Menu with Link Items
      </h1>

      <Menu.Root>
        <Menu.Trigger data-testid="menu-trigger" class={styles.Trigger}>
          Open Menu
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup class={styles.Popup}>
              <Menu.LinkItem
                data-testid="link-one"
                href="/e2e-fixtures/menu/PageOne"
                class={styles.LinkItem}
              >
                Page one
              </Menu.LinkItem>

              <Menu.LinkItem
                data-testid="link-two"
                href="/e2e-fixtures/menu/PageTwo"
                class={styles.LinkItem}
              >
                Page two
              </Menu.LinkItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
