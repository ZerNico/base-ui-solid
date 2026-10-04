import { Menu } from 'base-ui-solid/menu';
import { Link } from '@tanstack/solid-router';
import styles from './LinkItemNavigation.module.css';

// Port note: upstream renders react-router's `<Link>`. The port's e2e app routes with TanStack
// Router (see `../../main.tsx`), so this fixture renders its `<Link>` through a `render` function
// (React elements can't be cloned in Solid). The file name and the heading are kept so the test
// stays the same.
export default function ReactRouterLinkItemNavigation() {
  return (
    <div class={styles.Page}>
      <h1 data-testid="page-heading" class={styles.Heading}>
        Menu with React Router Link Items
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
                render={(props) => <Link {...(props as object)} to="/e2e-fixtures/menu/PageOne" />}
                class={styles.LinkItem}
              >
                Page one
              </Menu.LinkItem>

              <Menu.LinkItem
                data-testid="link-two"
                href="/e2e-fixtures/menu/PageTwo"
                render={(props) => <Link {...(props as object)} to="/e2e-fixtures/menu/PageTwo" />}
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
