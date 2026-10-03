import { createSignal, isHydrating, onSettled, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { isServer } from '@solidjs/web';

/**
 * Returns `true` once Solid has taken over on the client.
 *
 * Port note: upstream reads React's server snapshot through `useSyncExternalStore`. Solid exposes
 * whether the current owner is hydrating server-rendered markup, so the hook starts from that and
 * flips once the hydrated tree has settled. Returns an accessor.
 */
export function useIsHydrated(): Accessor<boolean> {
  const [hydrated, setHydrated] = createSignal(!isServer && !isHydrating());

  // The server render and the hydration pass must create the same owners, so that hydration
  // keys line up.
  if (!untrack(hydrated)) {
    onSettled(() => {
      if (!isServer) {
        setHydrated(true);
      }
    });
  }

  return hydrated;
}

/**
 * Returns `true` while Solid is hydrating server-rendered markup and `false`
 * for fresh client-only mounts — the exact inverse of {@link useIsHydrated}.
 */
export function useIsHydrating(): Accessor<boolean> {
  const isHydrated = useIsHydrated();
  return () => !isHydrated();
}
