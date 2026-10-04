import { mergeProps } from 'base-ui-solid/merge-props';
import type { JSX } from '@solidjs/web';
import { Menubar } from 'base-ui-solid/menubar';
import { Menu } from 'base-ui-solid/menu';
import styles from './index.module.css';

export default function ExampleMenubar() {
  return (
    <Menubar class={styles.Menubar}>
      <Menu.Root>
        <Menu.Trigger class={styles.MenuTrigger}>File</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner class={styles.MenuPositioner} sideOffset={4}>
            <Menu.Popup class={styles.MenuPopup}>
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                New
              </Menu.Item>
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Open
              </Menu.Item>
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Save
              </Menu.Item>

              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger class={styles.SubmenuTrigger}>
                  Export
                  <CaretRightIcon />
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner class={styles.MenuPositioner} sideOffset={-4} alignOffset={-4}>
                    <Menu.Popup class={styles.MenuPopup}>
                      <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                        PDF
                      </Menu.Item>
                      <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                        PNG
                      </Menu.Item>
                      <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                        SVG
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>

              <Menu.Separator class={styles.MenuSeparator} />
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Print
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger class={styles.MenuTrigger}>Edit</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner class={styles.MenuPositioner} sideOffset={4}>
            <Menu.Popup class={styles.MenuPopup}>
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Cut
              </Menu.Item>
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Copy
              </Menu.Item>
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Paste
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger class={styles.MenuTrigger}>View</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner class={styles.MenuPositioner} sideOffset={4}>
            <Menu.Popup class={styles.MenuPopup}>
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Zoom In
              </Menu.Item>
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Zoom Out
              </Menu.Item>

              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger class={styles.SubmenuTrigger}>
                  Layout
                  <CaretRightIcon />
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner class={styles.MenuPositioner} sideOffset={-4} alignOffset={-4}>
                    <Menu.Popup class={styles.MenuPopup}>
                      <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                        Single Page
                      </Menu.Item>
                      <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                        Two Pages
                      </Menu.Item>
                      <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                        Continuous
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>

              <Menu.Separator class={styles.MenuSeparator} />
              <Menu.Item class={styles.MenuItem} onClick={handleClick}>
                Full Screen
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root disabled>
        <Menu.Trigger class={styles.MenuTrigger}>Help</Menu.Trigger>
      </Menu.Root>
    </Menubar>
  );
}

function handleClick(event: MouseEvent) {
  // eslint-disable-next-line no-console
  console.log(`${(event.currentTarget as HTMLElement).textContent} clicked`);
}

// Port note: merging native SVG props preserves string/object styles; the cast restores native event types.
function CaretRightIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...(mergeProps<JSX.IntrinsicElements['svg']>(
        { style: { display: 'block' } },
        props,
      ) as JSX.IntrinsicElements['svg'])}
    >
      <path d="M6 12V4l4.5 4z" />
    </svg>
  );
}
