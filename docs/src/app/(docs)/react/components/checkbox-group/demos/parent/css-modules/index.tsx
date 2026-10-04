// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { createSignal, createUniqueId } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Checkbox } from 'base-ui-solid/checkbox';
import { CheckboxGroup } from 'base-ui-solid/checkbox-group';
import styles from './index.module.css';

const fruits = ['fuji-apple', 'gala-apple', 'granny-smith-apple'];

export default function ExampleCheckboxGroup() {
  const id = createUniqueId();
  const [value, setValue] = createSignal<string[]>([]);

  return (
    <CheckboxGroup
      aria-labelledby={id}
      value={value()}
      onValueChange={setValue}
      allValues={fruits}
      class={styles.CheckboxGroup}
      style={{ 'margin-left': '1rem' }}
    >
      <label class={styles.Item} id={id} style={{ 'margin-left': '-1rem' }}>
        <Checkbox.Root class={styles.Checkbox} parent>
          <Checkbox.Indicator
            class={styles.Indicator}
            render={(props, state) => (
              <span {...props}>{state.indeterminate ? <HorizontalRuleIcon /> : <CheckIcon />}</span>
            )}
          />
        </Checkbox.Root>
        Apples
      </label>

      <label class={styles.Item}>
        <Checkbox.Root value="fuji-apple" class={styles.Checkbox}>
          <Checkbox.Indicator class={styles.Indicator}>
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        Fuji
      </label>

      <label class={styles.Item}>
        <Checkbox.Root value="gala-apple" class={styles.Checkbox}>
          <Checkbox.Indicator class={styles.Indicator}>
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        Gala
      </label>

      <label class={styles.Item}>
        <Checkbox.Root value="granny-smith-apple" class={styles.Checkbox}>
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

function HorizontalRuleIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke-width={1}
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  );
}
