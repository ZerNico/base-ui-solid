// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Menu } from 'base-ui-solid/menu';
import styles from './index.module.css';

export default function ExampleMenu() {
  const [showMinimap, setShowMinimap] = createSignal(true);
  const [showSearch, setShowSearch] = createSignal(true);
  const [showSidebar, setShowSidebar] = createSignal(false);

  return (
    <Menu.Root>
      <Menu.Trigger class={styles.Button}>
        Workspace <CaretDownIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner class={styles.Positioner} sideOffset={8} align="start">
          <Menu.Popup class={styles.Popup}>
            <Menu.CheckboxItem
              checked={showMinimap()}
              onCheckedChange={setShowMinimap}
              class={styles.CheckboxItem}
            >
              <Menu.CheckboxItemIndicator class={styles.CheckboxItemIndicator}>
                <CheckIcon />
              </Menu.CheckboxItemIndicator>
              <span class={styles.CheckboxItemText}>Minimap</span>
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              checked={showSearch()}
              onCheckedChange={setShowSearch}
              class={styles.CheckboxItem}
            >
              <Menu.CheckboxItemIndicator class={styles.CheckboxItemIndicator}>
                <CheckIcon />
              </Menu.CheckboxItemIndicator>
              <span class={styles.CheckboxItemText}>Search</span>
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              checked={showSidebar()}
              onCheckedChange={setShowSidebar}
              class={styles.CheckboxItem}
            >
              <Menu.CheckboxItemIndicator class={styles.CheckboxItemIndicator}>
                <CheckIcon />
              </Menu.CheckboxItemIndicator>
              <span class={styles.CheckboxItemText}>Sidebar</span>
            </Menu.CheckboxItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function CaretDownIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="M12 6H4l4 4.5z" />
    </svg>
  );
}

function CheckIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}
