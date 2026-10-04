import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Menu } from 'base-ui-solid/menu';
import styles from './index.module.css';

export default function ExampleMenu() {
  const [value, setValue] = createSignal('date');
  const [showMinimap, setShowMinimap] = createSignal(true);
  const [showSearch, setShowSearch] = createSignal(true);
  const [showSidebar, setShowSidebar] = createSignal(false);

  return (
    <Menu.Root>
      <Menu.Trigger class={styles.Button}>
        View <CaretDownIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner class={styles.Positioner} sideOffset={8} align="start">
          <Menu.Popup class={styles.Popup}>
            <Menu.RadioGroup value={value()} onValueChange={setValue}>
              <Menu.GroupLabel class={styles.GroupLabel}>Sort</Menu.GroupLabel>
              <Menu.RadioItem class={styles.RadioItem} value="date">
                <Menu.RadioItemIndicator class={styles.RadioItemIndicator}>
                  <CheckIcon />
                </Menu.RadioItemIndicator>
                <span class={styles.RadioItemText}>Date</span>
              </Menu.RadioItem>
              <Menu.RadioItem class={styles.RadioItem} value="name">
                <Menu.RadioItemIndicator class={styles.RadioItemIndicator}>
                  <CheckIcon />
                </Menu.RadioItemIndicator>
                <span class={styles.RadioItemText}>Name</span>
              </Menu.RadioItem>
              <Menu.RadioItem class={styles.RadioItem} value="type">
                <Menu.RadioItemIndicator class={styles.RadioItemIndicator}>
                  <CheckIcon />
                </Menu.RadioItemIndicator>
                <span class={styles.RadioItemText}>Type</span>
              </Menu.RadioItem>
            </Menu.RadioGroup>

            <Menu.Separator class={styles.Separator} />

            <Menu.Group>
              <Menu.GroupLabel class={styles.GroupLabel}>Workspace</Menu.GroupLabel>
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
            </Menu.Group>
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
