import { createUniqueId, For } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';
import styles from './index.module.css';

export default function ExampleMultipleCombobox() {
  const id = createUniqueId();

  return (
    <Combobox.Root items={langs} multiple>
      <div class={styles.Container}>
        <label class={styles.Label} for={id}>
          Programming languages
        </label>
        <Combobox.InputGroup class={styles.InputGroup}>
          <Combobox.Value>
            {(value: Accessor<ProgrammingLanguage[]>) => (
              <Combobox.Chips
                class={styles.Chips}
                aria-label={value().length > 0 ? 'Selected languages' : undefined}
              >
                <For each={value()}>
                  {(language) => (
                    <Combobox.Chip
                      class={styles.Chip}
                      aria-label={language.value}
                      aria-description="Press Backspace or Delete to remove"
                    >
                      {language.value}
                      <Combobox.ChipRemove
                        class={styles.ChipRemove}
                        aria-label={`Remove ${language.value}`}
                      >
                        <XIcon />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  )}
                </For>
                <Combobox.Input
                  id={id}
                  placeholder={value().length > 0 ? '' : 'e.g. TypeScript'}
                  aria-description={
                    value().length > 0
                      ? `${value().length} selected. From the start of the input, press Left Arrow to focus the selected items`
                      : undefined
                  }
                  class={styles.Input}
                />
              </Combobox.Chips>
            )}
          </Combobox.Value>
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner class={styles.Positioner} sideOffset={4}>
          <Combobox.Popup class={styles.Popup}>
            <Combobox.Empty>
              <div class={styles.Empty}>No languages found.</div>
            </Combobox.Empty>
            <Combobox.List>
              {(language: Accessor<ProgrammingLanguage>) => (
                <Combobox.Item class={styles.Item} value={language()}>
                  <Combobox.ItemIndicator class={styles.ItemIndicator}>
                    <CheckIcon />
                  </Combobox.ItemIndicator>
                  <span class={styles.ItemText}>{language().value}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
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

function XIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="square"
      stroke-linejoin="round"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="m4.5 4.5 7 7m-7 0 7-7" />
    </svg>
  );
}

interface ProgrammingLanguage {
  id: string;
  value: string;
}

const langs: ProgrammingLanguage[] = [
  { id: 'js', value: 'JavaScript' },
  { id: 'ts', value: 'TypeScript' },
  { id: 'py', value: 'Python' },
  { id: 'java', value: 'Java' },
  { id: 'cpp', value: 'C++' },
  { id: 'cs', value: 'C#' },
  { id: 'php', value: 'PHP' },
  { id: 'ruby', value: 'Ruby' },
  { id: 'go', value: 'Go' },
  { id: 'rust', value: 'Rust' },
  { id: 'swift', value: 'Swift' },
];
