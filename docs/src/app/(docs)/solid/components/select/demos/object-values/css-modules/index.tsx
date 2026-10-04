import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Select } from 'base-ui-solid/select';
import styles from './index.module.css';

export default function ObjectValueSelect() {
  return (
    <div class={styles.Field}>
      <Select.Root defaultValue={shippingMethods[0]} itemToStringValue={(item) => item.id}>
        <Select.Label class={styles.Label}>Shipping method</Select.Label>
        <Select.Trigger class={styles.Select}>
          <Select.Value>
            {(method: ShippingMethod) => (
              <span class={styles.ValueText}>
                <span class={styles.ValuePrimary}>{method.name}</span>
                <span class={styles.ValueSecondary}>
                  {method.duration} ({method.price})
                </span>
              </span>
            )}
          </Select.Value>
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
                <For each={shippingMethods}>
                  {(method) => (
                    <Select.Item value={method} class={styles.Item}>
                      <Select.ItemIndicator class={styles.ItemIndicator}>
                        <CheckIcon />
                      </Select.ItemIndicator>
                      <Select.ItemText class={styles.ItemText}>
                        <span class={styles.ItemLabel}>{method.name}</span>
                        <span class={styles.ItemDescription}>
                          {method.duration} ({method.price})
                        </span>
                      </Select.ItemText>
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

interface ShippingMethod {
  id: string;
  name: string;
  duration: string;
  price: string;
}

const shippingMethods: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Standard',
    duration: 'Delivers in 4-6 business days',
    price: '$4.99',
  },
  {
    id: 'express',
    name: 'Express',
    duration: 'Delivers in 2-3 business days',
    price: '$9.99',
  },
  {
    id: 'overnight',
    name: 'Overnight',
    duration: 'Delivers next business day',
    price: '$19.99',
  },
];

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
