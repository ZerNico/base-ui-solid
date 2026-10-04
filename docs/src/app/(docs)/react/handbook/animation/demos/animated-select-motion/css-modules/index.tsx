import { createSignal, For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Select } from 'base-ui-solid/select';
import { AnimatedPopup } from '../../animated-popup';
import styles from './index.module.css';

const fonts = [
  { label: 'Select font', value: null },
  { label: 'Sans-serif', value: 'sans' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'mono' },
  { label: 'Cursive', value: 'cursive' },
];

export default function AnimatedSelectMotionDemo() {
  const [open, setOpen] = createSignal(false);
  return (
    <Select.Root items={fonts} open={open()} onOpenChange={setOpen}>
      <Select.Trigger class={styles.Select}>
        <Select.Value class={styles.Value} />
        <Select.Icon>
          <CaretUpDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <div style={{ display: 'contents' }}>
        {
          <Select.Portal>
            <Select.Positioner class={styles.Positioner} sideOffset={4}>
              <Select.Popup
                class={styles.Popup}
                render={(props, state) => <AnimatedPopup {...props} open={state.open} />}
              >
                <Select.ScrollUpArrow class={styles.ScrollArrow} />
                <Select.List class={styles.List}>
                  <For each={fonts}>
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
                <Select.ScrollDownArrow class={styles.ScrollArrow} />
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        }
      </div>
    </Select.Root>
  );
}

function CaretUpDownIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={props.style}
    >
      <path d="M11 10H5l3 3.5zm0-4H5l3-3.5z" />
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
      style={props.style}
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}
