import { createSignal, createMemo, createUniqueId, For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';
import { Dialog } from 'base-ui-solid/dialog';

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
        <div class="max-w-md flex flex-col gap-1">
          <label
            class="flex flex-col gap-1 text-sm leading-5 font-bold text-neutral-950 dark:text-white"
            for={id}
          >
            Labels
          </label>
          <Combobox.InputGroup class="flex min-h-8 w-64 cursor-text flex-wrap items-center gap-0.5 border border-neutral-950 bg-white dark:bg-neutral-950 px-2 py-1 focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-neutral-950 dark:focus-within:outline-white has-[button]:px-1 dark:border-white min-[32rem]:w-[22rem]">
            <Combobox.Value>
              {(value: LabelItem[]) => (
                <Combobox.Chips
                  class="flex w-full flex-wrap items-center gap-1"
                  aria-label={value.length > 0 ? 'Selected labels' : undefined}
                >
                  <For each={value}>
                    {(label) => (
                      <Combobox.Chip
                        class="group flex min-h-[calc(1.5rem-2px)] cursor-default items-center gap-1 overflow-hidden bg-neutral-100 py-0 pr-[0.2rem] pl-[0.4rem] text-sm leading-none text-neutral-950 outline-none focus-within:bg-neutral-950 focus-within:text-white [@media(hover:hover)]:data-highlighted:bg-neutral-950 [@media(hover:hover)]:data-highlighted:text-white dark:bg-neutral-800 dark:text-white dark:focus-within:bg-white dark:focus-within:text-neutral-950 dark:[@media(hover:hover)]:data-highlighted:bg-white dark:[@media(hover:hover)]:data-highlighted:text-neutral-950"
                        aria-label={label.value}
                        aria-description="Press Backspace or Delete to remove"
                      >
                        {label.value}
                        <Combobox.ChipRemove
                          class="flex size-4 items-center justify-center border-0 bg-transparent p-0 text-inherit hover:bg-neutral-200 group-focus-within:hover:bg-neutral-700 dark:hover:bg-neutral-700 dark:group-focus-within:hover:bg-neutral-200"
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
                    class="h-[calc(1.5rem-2px)] min-w-12 flex-1 border-0 bg-white p-0 text-sm any-pointer-coarse:text-base dark:bg-neutral-950 font-normal text-neutral-950 outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400 dark:text-white"
                    onKeyDown={handleInputKeyDown}
                  />
                </Combobox.Chips>
              )}
            </Combobox.Value>
          </Combobox.InputGroup>
        </div>

        <Combobox.Portal>
          <Combobox.Positioner class="z-50 outline-none" sideOffset={4}>
            <Combobox.Popup class="w-[var(--anchor-width)] max-h-[min(var(--available-height),24.5rem)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain border border-neutral-950 bg-white py-1 text-neutral-950 shadow-[0.25rem_0.25rem_0_rgb(0_0_0_/_12%)] transition-[scale,opacity] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none">
              <Combobox.Empty>
                <div class="py-2 pr-4 pl-2 text-sm leading-4 text-neutral-500 dark:text-neutral-400">
                  No labels found.
                </div>
              </Combobox.Empty>
              <Combobox.List>
                {(item: LabelItem) =>
                  item.creatable ? (
                    <Combobox.Item
                      class="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 p-2 text-sm leading-4 outline-none select-none data-selected:relative data-selected:z-0 data-selected:text-neutral-950 data-selected:before:absolute data-selected:before:inset-0 data-selected:before:z-[-1] [@media(hover:hover)]:data-highlighted:relative [@media(hover:hover)]:data-highlighted:z-0 [@media(hover:hover)]:data-highlighted:text-white [@media(hover:hover)]:data-highlighted:before:absolute [@media(hover:hover)]:data-highlighted:before:inset-0 [@media(hover:hover)]:data-highlighted:before:z-[-1] [@media(hover:hover)]:data-highlighted:before:bg-neutral-950 dark:data-selected:text-white dark:[@media(hover:hover)]:data-highlighted:text-neutral-950 dark:[@media(hover:hover)]:data-highlighted:before:bg-white"
                      value={item}
                    >
                      <span class="col-start-1">
                        <PlusIcon />
                      </span>
                      <span class="col-start-2">Create "{item.creatable}"</span>
                    </Combobox.Item>
                  ) : (
                    <Combobox.Item
                      class="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 p-2 text-sm leading-4 outline-none select-none data-selected:relative data-selected:z-0 data-selected:text-neutral-950 data-selected:before:absolute data-selected:before:inset-0 data-selected:before:z-[-1] [@media(hover:hover)]:data-highlighted:relative [@media(hover:hover)]:data-highlighted:z-0 [@media(hover:hover)]:data-highlighted:text-white [@media(hover:hover)]:data-highlighted:before:absolute [@media(hover:hover)]:data-highlighted:before:inset-0 [@media(hover:hover)]:data-highlighted:before:z-[-1] [@media(hover:hover)]:data-highlighted:before:bg-neutral-950 dark:data-selected:text-white dark:[@media(hover:hover)]:data-highlighted:text-neutral-950 dark:[@media(hover:hover)]:data-highlighted:before:bg-white"
                      value={item}
                    >
                      <Combobox.ItemIndicator class="col-start-1">
                        <CheckIcon />
                      </Combobox.ItemIndicator>
                      <span class="col-start-2">{item.value}</span>
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
          <Dialog.Backdrop class="fixed inset-0 min-h-dvh bg-black opacity-20 transition-opacity dark:opacity-70 data-starting-style:opacity-0 data-ending-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
          <Dialog.Popup
            class="fixed top-1/2 left-1/2 mt-[-2rem] w-[24rem] max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 border border-neutral-950 bg-white p-6 text-neutral-950 shadow-[0.25rem_0.25rem_0_rgb(0_0_0_/_12%)] transition-all data-starting-style:scale-90 data-starting-style:opacity-0 data-ending-style:scale-90 data-ending-style:opacity-0 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none"
            initialFocus={() => createInputRef.current}
          >
            <Dialog.Title class="text-sm leading-5 font-bold">Create new label</Dialog.Title>
            <Dialog.Description class="mb-4 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
              Add a new label to select.
            </Dialog.Description>
            <form onSubmit={handleCreateSubmit}>
              <input
                ref={(element) => {
                  createInputRef.current = element;
                }}
                class="h-8 w-full border border-neutral-950 bg-white dark:bg-neutral-950 px-2 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:border-white dark:text-white"
                placeholder="Label name"
                defaultValue={pendingQueryRef.current}
              />
              <div class="mt-4 flex justify-end gap-3">
                <Dialog.Close class="flex h-8 items-center justify-center gap-2 border border-neutral-950 bg-white px-3 text-sm whitespace-nowrap font-normal text-neutral-950 select-none hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:active:bg-neutral-700">
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  class="flex h-8 items-center justify-center gap-2 border border-neutral-950 bg-white px-3 text-sm whitespace-nowrap font-normal text-neutral-950 select-none hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:active:bg-neutral-700"
                >
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
