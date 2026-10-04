import { createMemo, createSignal, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { PopupHandleStoreProvider } from './popupHandle';

/**
 * Reads the store currently exposed by a popup handle and subscribes to store-pointer changes.
 * Detached triggers use this to follow a handle as a root attaches or detaches: while no root is
 * attached, the handle exposes its fallback store; once a root attaches, subscribers re-render and
 * read from the live root store.
 *
 * Returns `undefined` when no handle is provided so callers can fall back to their root context.
 *
 * Port note: returns an accessor (upstream uses `useSyncExternalStore`). The handle is read once.
 * During hydration, upstream renders `handle.serverStore`; the fallback store is what the handle
 * exposes until a root attaches, so the first value matches it.
 *
 * @param handle The popup handle to read from, or `undefined` when the trigger is not handle-bound.
 */
export function usePopupHandleStore<HandleStore>(
  handle: PopupHandleStoreProvider<HandleStore> | undefined,
): Accessor<HandleStore | undefined> {
  const [track, trigger] = createSignal(undefined, { equals: false, ownedWrite: true });

  if (handle !== undefined) {
    const unsubscribe = handle.subscribeStore(() => {
      trigger(undefined);
    });
    onCleanup(unsubscribe);
  }

  return createMemo(() => {
    track();
    return handle === undefined ? undefined : handle.store;
  });
}
