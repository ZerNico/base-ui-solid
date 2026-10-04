import type { JSX } from '@solidjs/web';
import { Checkbox } from 'base-ui-solid/checkbox';
import styles from './index.module.css';

export default function ExampleCheckbox() {
  return (
    <label class={styles.Label}>
      <Checkbox.Root defaultChecked class={styles.Checkbox}>
        <Checkbox.Indicator class={styles.Indicator}>
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox.Root>
      Enable notifications
    </label>
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
