import { createMemo, createSignal, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import { useIsHydrating } from '@base-ui-solid/utils/hydration';
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
 * Like upstream's server snapshot, it returns `handle.serverStore` on the server and while
 * hydrating, so the hydrated markup matches the server's even when a root has already attached
 * (Solid doesn't patch attributes that differ during hydration), then switches to `handle.store`.
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

  const isHydrating = useIsHydrating();

  return createMemo(() => {
    track();
    if (handle === undefined) {
      return undefined;
    }
    return isHydrating() ? handle.serverStore : handle.store;
  });
}
