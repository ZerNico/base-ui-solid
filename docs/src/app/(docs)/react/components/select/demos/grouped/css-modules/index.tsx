// Port note: Solid represents sibling JSX nodes as arrays.
import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Select } from 'base-ui-solid/select';
import { Field } from 'base-ui-solid/field';
import styles from './index.module.css';

export default function ExampleSelectGrouped() {
  return (
    <Field.Root class={styles.Field}>
      <Field.Label class={styles.Label} nativeLabel={false} render="div">
        Produce
      </Field.Label>
      <Select.Root items={groupedProduce}>
        <Select.Trigger class={styles.Select}>
          <Select.Value class={styles.Value} placeholder="Select produce" />
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
                <For each={groupedProduce}>
                  {(group, index) => [
                    <Select.Group class={styles.Group}>
                      <Select.GroupLabel class={styles.GroupLabel}>{group.value}</Select.GroupLabel>
                      <For each={group.items}>
                        {(item) => (
                          <Select.Item value={item.value} class={styles.Item}>
                            <Select.ItemIndicator class={styles.ItemIndicator}>
                              <CheckIcon />
                            </Select.ItemIndicator>
                            <Select.ItemText class={styles.ItemText}>{item.label}</Select.ItemText>
                          </Select.Item>
                        )}
                      </For>
                    </Select.Group>,
                    index() < groupedProduce.length - 1 ? (
                      <Select.Separator class={styles.Separator} />
                    ) : null,
                  ]}
                </For>
              </Select.List>
              <Select.ScrollDownArrow class={styles.ScrollArrow}>
                <CaretDownIcon />
              </Select.ScrollDownArrow>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </Field.Root>
  );
}
function CaretUpDownIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & {
    style?: JSX.CSSProperties;
  },
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
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & {
    style?: JSX.CSSProperties;
  },
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
const groupedProduce = [
  {
    value: 'Fruits',
    items: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'mango', label: 'Mango' },
      { value: 'kiwi', label: 'Kiwi' },
      { value: 'grape', label: 'Grape' },
      { value: 'orange', label: 'Orange' },
      { value: 'strawberry', label: 'Strawberry' },
      { value: 'watermelon', label: 'Watermelon' },
    ],
  },
  {
    value: 'Vegetables',
    items: [
      { value: 'broccoli', label: 'Broccoli' },
      { value: 'carrot', label: 'Carrot' },
      { value: 'cauliflower', label: 'Cauliflower' },
      { value: 'cucumber', label: 'Cucumber' },
      { value: 'kale', label: 'Kale' },
      { value: 'pepper', label: 'Bell pepper' },
      { value: 'spinach', label: 'Spinach' },
      { value: 'zucchini', label: 'Zucchini' },
    ],
  },
];
function CaretUpIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & {
    style?: JSX.CSSProperties;
  },
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
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & {
    style?: JSX.CSSProperties;
  },
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
