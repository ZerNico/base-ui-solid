import { onCleanup, runWithOwner } from 'solid-js';

/**
 * Runs a cleanup that may write reactive state, like React's effect cleanups and ref detaches do
 * (unregistering an item from its parent, resetting the parent's state).
 *
 * Solid runs disposal cleanups from inside the computation that removed the owner (a `<For>` row,
 * a `<Show>` branch). In dev, a signal write there throws `REACTIVE_WRITE_IN_OWNED_SCOPE` and halts
 * the reactive system. Running the cleanup without an owner makes its writes ordinary writes,
 * applied with the next flush, as they already are in production.
 */
export function runCleanup(cleanup: () => void) {
  runWithOwner(null, cleanup);
}

/**
 * `onCleanup` for cleanups that may write reactive state. See `runCleanup`.
 */
export function onCleanupWithWrites(cleanup: () => void) {
  onCleanup(() => runCleanup(cleanup));
}
