// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { createUniqueId } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Checkbox } from 'base-ui-solid/checkbox';
import { CheckboxGroup } from 'base-ui-solid/checkbox-group';

export default function ExampleCheckboxGroup() {
  const id = createUniqueId();
  return (
    <CheckboxGroup
      aria-labelledby={id}
      defaultValue={['fuji-apple']}
      class="flex flex-col items-start gap-1 text-neutral-950 dark:text-white"
    >
      <div class="text-sm font-bold" id={id}>
        Apples
      </div>

      <label class="flex items-center gap-2 text-sm font-normal text-neutral-950 dark:text-white">
        <Checkbox.Root
          name="apple"
          value="fuji-apple"
          class="flex size-4 shrink-0 items-center justify-center border rounded-none p-0 border-neutral-950 bg-white text-white dark:border-white dark:bg-neutral-950 dark:text-neutral-950 data-checked:bg-neutral-950 data-checked:text-white dark:data-checked:bg-white dark:data-checked:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
        >
          <Checkbox.Indicator class="flex data-unchecked:hidden">
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        Fuji
      </label>

      <label class="flex items-center gap-2 text-sm font-normal text-neutral-950 dark:text-white">
        <Checkbox.Root
          name="apple"
          value="gala-apple"
          class="flex size-4 shrink-0 items-center justify-center border rounded-none p-0 border-neutral-950 bg-white text-white dark:border-white dark:bg-neutral-950 dark:text-neutral-950 data-checked:bg-neutral-950 data-checked:text-white dark:data-checked:bg-white dark:data-checked:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
        >
          <Checkbox.Indicator class="flex data-unchecked:hidden">
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        Gala
      </label>

      <label class="flex items-center gap-2 text-sm font-normal text-neutral-950 dark:text-white">
        <Checkbox.Root
          name="apple"
          value="granny-smith-apple"
          class="flex size-4 shrink-0 items-center justify-center border rounded-none p-0 border-neutral-950 bg-white text-white dark:border-white dark:bg-neutral-950 dark:text-neutral-950 data-checked:bg-neutral-950 data-checked:text-white dark:data-checked:bg-white dark:data-checked:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
        >
          <Checkbox.Indicator class="flex data-unchecked:hidden">
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
