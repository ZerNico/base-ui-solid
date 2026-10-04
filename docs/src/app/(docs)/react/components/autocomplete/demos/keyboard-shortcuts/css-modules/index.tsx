// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.

import { Autocomplete } from 'base-ui-solid/autocomplete';
import styles from './index.module.css';

export default function ExampleAutocompleteKeyboardShortcuts() {
  const actionsRef = { current: null } as { current: Autocomplete.Root.Actions | null };

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
    actionsRef.current?.highlightItem(target);
  }

  return (
    <Autocomplete.Root items={commands} actionsRef={actionsRef}>
      <div class={styles.Field}>
        <label class={styles.Label}>
          Search commands
          <Autocomplete.Input
            placeholder="e.g. commit"
            class={styles.Input}
            onKeyDown={handleKeyDown}
          />
        </label>
        <p class={styles.Hint}>Navigate with Ctrl+N and Ctrl+P.</p>
      </div>

      <Autocomplete.Portal>
        <Autocomplete.Positioner class={styles.Positioner} sideOffset={4}>
          <Autocomplete.Popup class={styles.Popup}>
            <Autocomplete.Empty>
              <div class={styles.Empty}>No commands found.</div>
            </Autocomplete.Empty>
            <Autocomplete.List class={styles.List}>
              {(command: string) => (
                <Autocomplete.Item class={styles.Item} value={command}>
                  {command}
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
