import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Menu } from 'base-ui-solid/menu';
import styles from './index.module.css';

export default function ExampleMenu() {
  const [value, setValue] = createSignal('date');
  return (
    <Menu.Root>
      <Menu.Trigger class={styles.Button}>
        Sort <CaretDownIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner class={styles.Positioner} sideOffset={8} align="start">
          <Menu.Popup class={styles.Popup}>
            <Menu.RadioGroup value={value()} onValueChange={setValue}>
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
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function CaretDownIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="M12 6H4l4 4.5z" />
    </svg>
  );
}

function CheckIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}
