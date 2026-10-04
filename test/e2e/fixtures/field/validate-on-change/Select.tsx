import { For } from 'solid-js';
import { Field } from 'base-ui-solid/field';
import { Select } from 'base-ui-solid/select';
import styles from './Select.module.css';

const items = [
  { label: 'select', value: null },
  { label: 'one', value: 'one' },
  { label: 'two', value: 'two' },
  { label: 'three', value: 'three' },
  { label: 'four', value: 'four' },
];

export default function SelectValidateOnChange() {
  return (
    <Field.Root
      validationMode="onChange"
      validate={(val) => {
        if (val === 'one') {
          return 'error one';
        }

        if (val === 'three') {
          return 'error three';
        }
        return null;
      }}
      class={styles.Root}
    >
      <Select.Root items={items} required>
        <Select.Trigger class={styles.Trigger}>
          <Select.Value />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner class={styles.Positioner} sideOffset={8}>
            <Select.Popup class={styles.Popup}>
              <Select.ScrollUpArrow class={`${styles.ScrollArrow} ${styles.ScrollUp}`} />
              <Select.List class={styles.List}>
                <For each={items}>
                  {(item) => (
                    <Select.Item value={item.value} class={styles.Item}>
                      <Select.ItemText>{item.label}</Select.ItemText>
                    </Select.Item>
                  )}
                </For>
              </Select.List>
              <Select.ScrollDownArrow class={`${styles.ScrollArrow} ${styles.ScrollDown}`} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Field.Error data-testid="error" class={styles.Error} match="valueMissing">
        valueMissing error
      </Field.Error>
      <Field.Error data-testid="error" class={styles.Error} match="customError" />
    </Field.Root>
  );
}
