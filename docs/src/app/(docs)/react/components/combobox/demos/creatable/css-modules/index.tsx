// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { createSignal, createMemo, createUniqueId, For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';
import { Dialog } from 'base-ui-solid/dialog';
import styles from './index.module.css';

export default function ExampleCreatableCombobox() {
  const id = createUniqueId();

  const [labels, setLabels] = createSignal<LabelItem[]>(initialLabels);
  const [selected, setSelected] = createSignal<LabelItem[]>([]);
  const [query, setQuery] = createSignal('');
  const [openDialog, setOpenDialog] = createSignal(false);

  const createInputRef = { current: null } as { current: HTMLInputElement | null };
  const comboboxInputRef = { current: null } as { current: HTMLInputElement | null };
  const pendingQueryRef = { current: '' };
  const highlightedItemRef = { current: undefined } as { current: LabelItem | undefined };

  function handleInputKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || highlightedItemRef.current) {
      return;
    }

    const currentTrimmed = query().trim();
    if (currentTrimmed === '') {
      return;
    }

    const normalized = currentTrimmed.toLocaleLowerCase();
    const existing = labels().find(
      (label) => label.value.trim().toLocaleLowerCase() === normalized,
    );

    if (existing) {
      setSelected((prev) =>
        prev.some((item) => item.id === existing.id) ? prev : [...prev, existing],
      );
      setQuery('');
      return;
    }

    pendingQueryRef.current = currentTrimmed;
    setOpenDialog(true);
  }

  function handleCreate() {
    const input = createInputRef.current || comboboxInputRef.current;
    const value = input ? input.value.trim() : '';
    if (!value) {
      return;
    }

    const normalized = value.toLocaleLowerCase();
    const baseId = normalized.replace(/\s+/g, '-');
    const existing = labels().find((l) => l.value.trim().toLocaleLowerCase() === normalized);

    if (existing) {
      setSelected((prev) => (prev.some((i) => i.id === existing.id) ? prev : [...prev, existing]));
      setOpenDialog(false);
      setQuery('');
      return;
    }

    // Ensure we don't collide with an existing id (e.g., value "docs" vs. existing id "docs")
    const existingIds = new Set(labels().map((l) => l.id));
    let uniqueId = baseId;
    if (existingIds.has(uniqueId)) {
      let i = 2;
      while (existingIds.has(`${baseId}-${i}`)) {
        i += 1;
      }
      uniqueId = `${baseId}-${i}`;
    }

    const newItem: LabelItem = { id: uniqueId, value };

    if (!selected().find((item) => item.id === newItem.id)) {
      setLabels((prev) => [...prev, newItem]);
      setSelected((prev) => [...prev, newItem]);
    }

    setOpenDialog(false);
    setQuery('');
  }

  function handleCreateSubmit(event: SubmitEvent) {
    event.preventDefault();
    handleCreate();
  }

  const trimmed = createMemo(() => query().trim());
  const lowered = createMemo(() => trimmed().toLocaleLowerCase());
  const exactExists = createMemo(() =>
    labels().some((l) => l.value.trim().toLocaleLowerCase() === lowered()),
  );
  // Show the creatable item alongside matches if there's no exact match
  const itemsForView = createMemo(() =>
    trimmed() !== '' && !exactExists()
      ? [
          ...labels(),
          { creatable: trimmed(), id: `create:${lowered()}`, value: `Create "${trimmed()}"` },
        ]
      : labels(),
  );

  return (
    <>
      <Combobox.Root
        items={itemsForView()}
        multiple
        onValueChange={(next) => {
          const creatableSelection = next.find(
            (item) => item.creatable && !selected().some((current) => current.id === item.id),
          );

          if (creatableSelection && creatableSelection.creatable) {
            pendingQueryRef.current = creatableSelection.creatable;
            setOpenDialog(true);
            return;
          }
          const clean = next.filter((i) => !i.creatable);
          setSelected(clean);
          setQuery('');
        }}
        value={selected()}
        inputValue={query()}
        onInputValueChange={setQuery}
        onItemHighlighted={(item) => {
          highlightedItemRef.current = item;
        }}
      >
        <div class={styles.Container}>
          <label class={styles.Label} for={id}>
            Labels
          </label>
          <Combobox.InputGroup class={styles.InputGroup}>
            <Combobox.Value>
              {(value: LabelItem[]) => (
                <Combobox.Chips
                  class={styles.Chips}
                  aria-label={value.length > 0 ? 'Selected labels' : undefined}
                >
                  <For each={value}>
                    {(label) => (
                      <Combobox.Chip
                        class={styles.Chip}
                        aria-label={label.value}
                        aria-description="Press Backspace or Delete to remove"
                      >
                        {label.value}
                        <Combobox.ChipRemove
                          class={styles.ChipRemove}
                          aria-label={`Remove ${label.value}`}
                        >
                          <XIcon />
                        </Combobox.ChipRemove>
                      </Combobox.Chip>
                    )}
                  </For>
                  <Combobox.Input
                    ref={(element) => {
                      comboboxInputRef.current = element;
                    }}
                    id={id}
                    placeholder={value.length > 0 ? '' : 'e.g. bug'}
                    aria-description={
                      value.length > 0
                        ? `${value.length} selected. From the start of the input, press Left Arrow to focus the selected items`
                        : undefined
                    }
                    class={styles.Input}
                    onKeyDown={handleInputKeyDown}
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
                <div class={styles.Empty}>No labels found.</div>
              </Combobox.Empty>
              <Combobox.List>
                {(item: LabelItem) =>
                  item.creatable ? (
                    <Combobox.Item class={styles.Item} value={item}>
                      <span class={styles.ItemIndicator}>
                        <PlusIcon />
                      </span>
                      <span class={styles.ItemText}>Create "{item.creatable}"</span>
                    </Combobox.Item>
                  ) : (
                    <Combobox.Item class={styles.Item} value={item}>
                      <Combobox.ItemIndicator class={styles.ItemIndicator}>
                        <CheckIcon />
                      </Combobox.ItemIndicator>
                      <span class={styles.ItemText}>{item.value}</span>
                    </Combobox.Item>
                  )
                }
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      <Dialog.Root open={openDialog()} onOpenChange={setOpenDialog}>
        <Dialog.Portal>
          <Dialog.Backdrop class={styles.Backdrop} />
          <Dialog.Popup class={styles.DialogPopup} initialFocus={() => createInputRef.current}>
            <Dialog.Title class={styles.Title}>Create new label</Dialog.Title>
            <Dialog.Description class={styles.Description}>
              Add a new label to select.
            </Dialog.Description>
            <form onSubmit={handleCreateSubmit}>
              <input
                ref={(element) => {
                  createInputRef.current = element;
                }}
                class={styles.TextField}
                placeholder="Label name"
                defaultValue={pendingQueryRef.current}
              />
              <div class={styles.Actions}>
                <Dialog.Close class={styles.Button}>Cancel</Dialog.Close>
                <button type="submit" class={styles.Button}>
                  Create
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
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

function PlusIcon(props: JSX.IntrinsicElements['svg']) {
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
      <path d="M1.5 8h13M8 14.5v-13" />
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

interface LabelItem {
  creatable?: string;
  id: string;
  value: string;
}

const initialLabels: LabelItem[] = [
  { id: 'bug', value: 'bug' },
  { id: 'docs', value: 'documentation' },
  { id: 'enhancement', value: 'enhancement' },
  { id: 'help-wanted', value: 'help wanted' },
  { id: 'good-first-issue', value: 'good first issue' },
];
