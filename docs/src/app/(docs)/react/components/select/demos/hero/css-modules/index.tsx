// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Select } from 'base-ui-solid/select';
import styles from './index.module.css';

const apples = [
  { label: 'Gala', value: 'gala' },
  { label: 'Fuji', value: 'fuji' },
  { label: 'Honeycrisp', value: 'honeycrisp' },
  { label: 'Granny Smith', value: 'granny-smith' },
  { label: 'Pink Lady', value: 'pink-lady' },
];

export default function ExampleSelect() {
  return (
    <div class={styles.Field}>
      <Select.Root items={apples}>
        <Select.Label class={styles.Label}>Apple</Select.Label>
        <Select.Trigger class={styles.Select}>
          <Select.Value class={styles.Value} placeholder="Select apple" />
          <Select.Icon>
            <CaretUpDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner class={styles.Positioner} sideOffset={4}>
            <Select.Popup class={styles.Popup}>
              <Select.ScrollUpArrow class={styles.ScrollArrow}>
                <CaretUpIcon />
              </Select.ScrollUpArrow>
              <Select.List class={styles.List}>
                <For each={apples}>
                  {({ label, value }) => (
                    <Select.Item value={value} class={styles.Item}>
                      <Select.ItemIndicator class={styles.ItemIndicator}>
                        <CheckIcon />
                      </Select.ItemIndicator>
                      <Select.ItemText class={styles.ItemText}>{label}</Select.ItemText>
                    </Select.Item>
                  )}
                </For>
              </Select.List>
              <Select.ScrollDownArrow class={styles.ScrollArrow}>
                <CaretDownIcon />
              </Select.ScrollDownArrow>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function CaretUpDownIcon(
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
      <path d="M11 10H5l3 3.5zm0-4H5l3-3.5z" />
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

function CaretUpIcon(
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
      <path d="M12 10H4l4-4.5z" />
    </svg>
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
