import type { Accessor } from 'solid-js';
import { Autocomplete } from 'base-ui-solid/autocomplete';

export default function ExampleAutocompleteKeyboardShortcuts() {
  let actions: Autocomplete.Root.Actions | undefined;

  function handleKeyDown(event: KeyboardEvent) {
    if (!event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // Lower-cased so the shortcuts still work with Caps Lock on or Shift held.
    const target = shortcuts[event.key.toLowerCase()];
    if (!target) {
      return;
    }

    event.preventDefault();
    actions?.highlightItem(target);
  }

  return (
    <Autocomplete.Root
      items={commands}
      actionsRef={(value) => {
        actions = value;
      }}
    >
      <div class="flex flex-col">
        <label class="flex flex-col gap-1 text-sm font-bold text-neutral-950 dark:text-white">
          Search commands
          <Autocomplete.Input
            placeholder="e.g. commit"
            onKeyDown={handleKeyDown}
            class="h-8 w-[16rem] border border-neutral-950 bg-white dark:bg-neutral-950 px-2 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 placeholder:opacity-100 placeholder:text-neutral-500 placeholder:[-webkit-text-fill-color:var(--color-neutral-500)] dark:placeholder:text-neutral-400 dark:placeholder:[-webkit-text-fill-color:var(--color-neutral-400)] focus:outline-2 focus:-outline-offset-1 focus:outline-neutral-950 dark:focus:outline-white dark:border-white dark:text-white"
          />
        </label>
        <p class="mt-1.5 text-xs leading-4 text-neutral-500 dark:text-neutral-400">
          Navigate with Ctrl+N and Ctrl+P.
        </p>
      </div>

      <Autocomplete.Portal>
        <Autocomplete.Positioner class="outline-hidden" sideOffset={4}>
          <Autocomplete.Popup class="w-[var(--anchor-width)] max-w-[var(--available-width)] border border-neutral-950 bg-white text-neutral-950 shadow-[0.25rem_0.25rem_0] shadow-black/12 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none">
            <Autocomplete.Empty>
              <div class="py-4 pr-4 pl-2 text-sm leading-4 text-neutral-500 dark:text-neutral-400">
                No commands found.
              </div>
            </Autocomplete.Empty>
            <Autocomplete.List class="outline-0 overflow-y-auto scroll-py-[0.25rem] py-1 overscroll-contain max-h-[min(22.5rem,var(--available-height))] data-empty:p-0">
              {(command: Accessor<string>) => (
                <Autocomplete.Item
                  class="flex cursor-default items-center gap-2 py-2 pr-2 pl-2 text-sm leading-4 outline-hidden select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-white data-highlighted:before:absolute data-highlighted:before:inset-x-0 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-950 dark:data-highlighted:text-neutral-950 dark:data-highlighted:before:bg-white"
                  value={command()}
                >
                  {command()}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}

const shortcuts: Record<string, Autocomplete.Root.HighlightItemTarget> = {
  n: 'next',
  p: 'previous',
};

const commands = [
  'Commit changes',
  'Create branch',
  'Discard changes',
  'Fetch origin',
  'Open pull request',
  'Pull changes',
  'Push changes',
  'Stash changes',
  'Switch branch',
  'View history',
];
