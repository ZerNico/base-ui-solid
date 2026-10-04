import { For } from 'solid-js';
import { Toast } from 'base-ui-solid/toast';

/**
 * @internal
 */
export function Button() {
  const { add } = Toast.useToastManager();
  return (
    <button
      type="button"
      onClick={() => {
        add({
          title: 'title',
          description: 'description',
          actionProps: {
            id: 'action',
            children: 'action',
          },
        });
      }}
    >
      add
    </button>
  );
}

/**
 * @internal
 */
export function List() {
  const toastManager = Toast.useToastManager();
  // Port note: keyed by id, like upstream's `key={toastItem.id}`.
  return (
    <For each={toastManager.toasts} keyed={(toastItem) => toastItem.id}>
      {(toastItem) => (
        <Toast.Root toast={toastItem()} data-testid="root">
          <Toast.Title data-testid="title" />
          <Toast.Description data-testid="description" />
          <Toast.Close aria-label="close-press" />
          <Toast.Action data-testid="action" />
        </Toast.Root>
      )}
    </For>
  );
}
