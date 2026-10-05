import { SolidStore } from '@base-ui-solid/utils/store';

type SelectorFunction<State> = (state: State, ...args: any[]) => any;

/**
 * A `SolidStore` whose state never changes.
 *
 * Useful for fallback stores that need to support normal store reads while detached from the
 * component that owns real state. Context values may still contain mutable refs or maps.
 */
export class NullStore<
  State extends object,
  Context = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
> extends SolidStore<State, Context, Selectors> {
  // `update`/`set`/`notifyAll` funnel through `setState` in the base `Store`, so overriding
  // `setState` alone would neutralize them today. They are overridden explicitly so the store stays
  // inert even if a future base-class change stops routing a mutator through `setState`.
  setState(_newState: State) {}

  update<const Key extends keyof State>(_changes: Pick<State, Key>) {}

  set<Key extends keyof State>(_key: Key, _value: State[Key]) {}

  notifyAll() {}

  // Port note: `useSyncedValue` & co. register their accessor as the source of a key instead of
  // writing it (see `SolidStore.register`), so registering is a no-op as well.
  protected register() {}
}
