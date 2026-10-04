import { createUniqueId } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Checkbox } from 'base-ui-solid/checkbox';
import { CheckboxGroup } from 'base-ui-solid/checkbox-group';
import styles from './index.module.css';

export default function ExampleCheckboxGroup() {
  const id = createUniqueId();
  return (
    <CheckboxGroup aria-labelledby={id} defaultValue={['fuji-apple']} class={styles.CheckboxGroup}>
      <div class={styles.Caption} id={id}>
        Apples
      </div>

      <label class={styles.Item}>
        <Checkbox.Root name="apple" value="fuji-apple" class={styles.Checkbox}>
          <Checkbox.Indicator class={styles.Indicator}>
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        Fuji
      </label>

      <label class={styles.Item}>
        <Checkbox.Root name="apple" value="gala-apple" class={styles.Checkbox}>
          <Checkbox.Indicator class={styles.Indicator}>
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        Gala
      </label>

      <label class={styles.Item}>
        <Checkbox.Root name="apple" value="granny-smith-apple" class={styles.Checkbox}>
          <Checkbox.Indicator class={styles.Indicator}>
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        Granny Smith
      </label>
    </CheckboxGroup>
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
