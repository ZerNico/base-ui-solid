import { createMemo, createSignal, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import { isServer } from '@solidjs/web';
import type { ReadonlyStore } from './Store';

/**
 * A selector argument, or an accessor returning it.
 *
 * Port note: upstream passes the current render's value. In Solid the hook runs once, so a
 * reactive argument is passed as an accessor and read inside the memo. Selector arguments that
 * are themselves functions must therefore be wrapped in an accessor (`() => fn`).
 */
export type MaybeAccessor<T> = T | Accessor<T>;

export type MaybeAccessorArgs<Args extends readonly any[]> = {
  [Index in keyof Args]: MaybeAccessor<Args[Index]>;
};

/**
 * Port note: upstream subscribes a component to the store with `useSyncExternalStore` and returns
 * the selected value for the current render. In Solid it returns an accessor backed by a memo
 * that re-runs the selector when Solid flushes, notifying its readers only when the selected value
 * changed (`Object.is`), like upstream. A `SolidStore` is tracked directly (`trackSelector`), so
 * values synced into it from props update in the same flush as the props. Other stores notify a
 * local signal from a `subscribe` listener. Arguments may be accessors (see {@link MaybeAccessor}).
 *
 * Must be called under an owner (a component or a root). The subscription is removed on disposal.
 */
export function useStore<State, Value>(
  store: ReadonlyStore<State>,
  selector: (state: State) => Value,
): Accessor<Value>;
export function useStore<State, Value, A1>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1) => Value,
  a1: MaybeAccessor<A1>,
): Accessor<Value>;
export function useStore<State, Value, A1, A2>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1, a2: A2) => Value,
  a1: MaybeAccessor<A1>,
  a2: MaybeAccessor<A2>,
): Accessor<Value>;
export function useStore<State, Value, A1, A2, A3>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1, a2: A2, a3: A3) => Value,
  a1: MaybeAccessor<A1>,
  a2: MaybeAccessor<A2>,
  a3: MaybeAccessor<A3>,
): Accessor<Value>;
export function useStore(
  store: ReadonlyStore<unknown>,
  selector: Function,
  a1?: unknown,
  a2?: unknown,
  a3?: unknown,
): Accessor<unknown> {
  if (isTrackable(store)) {
    return createMemo(
      () =>
        store.trackSelector(
          selector as (state: unknown, a1: unknown, a2: unknown, a3: unknown) => unknown,
          resolve(a1),
          resolve(a2),
          resolve(a3),
        ),
      { equals: Object.is, name: 'useStore' },
    );
  }

  const track = subscribeToStore(store);

  return createMemo(
    () => {
      track();
      return selector(store.getSnapshot(), resolve(a1), resolve(a2), resolve(a3));
    },
    { equals: Object.is, name: 'useStore' },
  );
}

/**
 * Subscribes to the store for the lifetime of the current owner and returns a function that
 * tracks the store's changes when called in a reactive scope.
 */
export function subscribeToStore(store: Pick<ReadonlyStore<unknown>, 'subscribe'>) {
  const [track, trigger] = createSignal(undefined, { equals: false, ownedWrite: true });
  if (isServer) {
    // Server rendering is a single pass: nothing re-renders, and writing the signal from a store
    // update (e.g. a Root seeding its store while rendering) triggers Solid's `SERVER_WRITE`
    // diagnostic. So don't subscribe.
    return track;
  }
  const unsubscribe = store.subscribe(() => {
    trigger(undefined);
  });
  onCleanup(unsubscribe);
  return track;
}

/**
 * A store that can be tracked in a reactive scope without a `subscribe` listener (`SolidStore`).
 */
interface TrackableStore<State> {
  trackSelector(
    selector: (state: State, a1: unknown, a2: unknown, a3: unknown) => unknown,
    a1?: unknown,
    a2?: unknown,
    a3?: unknown,
  ): unknown;
}

function isTrackable<State>(
  store: ReadonlyStore<State>,
): store is ReadonlyStore<State> & TrackableStore<State> {
  return typeof (store as Partial<TrackableStore<State>>).trackSelector === 'function';
}

function resolve(value: unknown) {
  return typeof value === 'function' ? value() : value;
}
