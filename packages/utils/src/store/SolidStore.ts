import { createMemo, createSignal, getObserver, onCleanup, untrack } from 'solid-js';
import type { Accessor, Signal } from 'solid-js';
import { Store } from './Store';
import { useStore } from './useStore';
import type { MaybeAccessorArgs } from './useStore';
import { useIsoLayoutEffect } from '../useIsoLayoutEffect';
import { NOOP } from '../empty';
import { IS_DEV } from '../isDev';
import { getStoreDebugName } from './storeDebugName';
import { isTrackingState, runWithTrackedState } from './trackedRead';

/**
 * A Store that supports controlled state keys, non-reactive values and provides utility methods for Solid.
 *
 * Port note: the name is kept so that upstream code ports 1:1. The `use*` methods are Solid
 * primitives: call them once, under an owner (a component body or a root).
 * - Values synchronized into the store (`useSyncedValue`, `useSyncedValues`, `useControlledProp`)
 *   are passed as accessors.
 * - `useState` returns an accessor; selector arguments may be accessors.
 * - `useContextCallback` takes an accessor returning the callback, read when it's called.
 */
/** A source's value meaning "nothing to synchronize": the raw state is used. */
const UNSET = Symbol('unset');

const NOOP_SOURCE = () => UNSET;

export class SolidStore<
  State extends object,
  Context = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
> extends Store<State> {
  /**
   * A `useSyncedValues` value that leaves the key as it is: not synchronized at the moment.
   */
  static readonly KEEP: typeof UNSET = UNSET;

  /**
   * Creates a new SolidStore instance.
   *
   * @param state Initial state of the store.
   * @param context Non-reactive context values.
   * @param selectors Optional selectors for use with `useState`.
   */
  constructor(state: State, context: Context = {} as Context, selectors?: Selectors) {
    super(state);
    this.context = context;
    this.selectors = selectors;
  }

  /**
   * Non-reactive values such as refs, callbacks, etc.
   */
  declare readonly context: Context;

  declare private selectors: Selectors | undefined;

  /**
   * Synchronizes a single external value into the store.
   *
   * Port note: the key is derived from `value` instead of being written from an
   * effect, so `state` and `useState` see it in the same flush. An imperative write to the key
   * wins until `value` changes, like upstream's layout effect that only re-syncs on a change.
   */
  useSyncedValue<Key extends keyof State>(key: Key, value: Accessor<State[Key]>) {
    this.registerDerived(key, value, false);
  }

  /**
   * Synchronizes a single external value into the store and
   * cleans it up (sets to `undefined`) on unmount.
   *
   * Derived, see {@link useSyncedValue}.
   */
  public useSyncedValueWithCleanup<Key extends KeysAllowingUndefined<State>>(
    key: Key,
    value: Accessor<State[Key]>,
  ) {
    this.registerDerived(key, value, true);
  }

  /**
   * Synchronizes multiple external values into the store.
   * Each value must match its state key. Pass an exact known subset rather than a broad
   * `Partial<State>`, which may contain `undefined` for required state fields.
   *
   * Derived, see {@link useSyncedValue}.
   *
   * Port note: pass a record of accessors (`{ open, value: () => props.value }`) when a source
   * reads another key of this store: with a single accessor, every key depends on all sources.
   *
   * Port note: a key set to {@link SolidStore.KEEP} isn't synchronized at the moment and keeps its
   * value (upstream leaves such a key out of the effect's `update`).
   *
   * @param statePart An exact subset of state fields to synchronize. Unknown keys are not accepted.
   */
  public useSyncedValues<const Key extends keyof State>(
    statePart: Accessor<SyncedValues<State, Key>>,
  ): void;

  public useSyncedValues<const Key extends keyof State>(
    statePart: SyncedValueAccessors<State, Key>,
  ): void;

  public useSyncedValues<const Key extends keyof State>(
    statePart: Accessor<SyncedValues<State, Key>> | SyncedValueAccessors<State, Key>,
  ) {
    // eslint-disable-next-line consistent-this
    const store = this;

    if (typeof statePart === 'object') {
      // Port note: one accessor per key, so each key only depends on its own source. A source may
      // then read another key of the same store (e.g. a prop bag built from the store's `open`).
      const accessorKeys = Object.keys(statePart) as Key[];
      const accessors = statePart as SyncedValueAccessors<State, Key>;
      // Changes when any of the values does. Only read to decide whether an imperative write to
      // one of the keys still holds, so the keys don't depend on each other otherwise. A source must
      // therefore not read a key of its own group that was written imperatively: deciding whether
      // that write holds would evaluate the source again (a cycle).
      const group = createMemo(
        () => accessorKeys.map((key) => accessors[key]()),
        IS_DEV
          ? {
              equals: haveSameValues,
              lazy: true,
              name: `${debugName(store, 'useSyncedValues')}.group`,
            }
          : { equals: haveSameValues, lazy: true },
      );
      const before = untrack(() => accessorKeys.map((key) => store.state[key]));
      for (const key of accessorKeys) {
        this.registerDerived(key, accessors[key], false, undefined, false, group);
      }
      this.notifyOnChange(accessorKeys, before);
      return;
    }

    let keys: string[] | undefined;

    const part = createMemo(
      () => {
        const nextPart = statePart();
        if (IS_DEV) {
          // Check that an object with the same shape is passed on every render
          const nextKeys = Object.keys(nextPart);
          if (keys === undefined) {
            keys = nextKeys;
          } else if (
            keys.length !== nextKeys.length ||
            keys.some((k, index) => k !== nextKeys[index])
          ) {
            console.error(
              'SolidStore.useSyncedValues expects the same prop keys on every render. Keys should be stable.',
            );
          }
        }
        return nextPart;
      },
      IS_DEV
        ? { equals: haveSameValues, name: `${debugName(store, 'useSyncedValues')}.part` }
        : { equals: haveSameValues },
    );

    const partKeys = Object.keys(untrack(part)) as Key[];
    const before = untrack(() => partKeys.map((key) => store.state[key]));
    for (const key of partKeys) {
      this.registerDerived(key, () => part()[key], false, undefined, false, part);
    }
    // One notification per change of the part, like upstream's single `update`.
    this.notifyOnChange(partKeys, before);
  }

  /**
   * Synchronizes `value` into the key while `when` is true. Afterwards the key keeps the
   * last synchronized value until it's written, like a value written by an effect, unless another
   * registration of the key is synchronizing it.
   */
  useConditionalSyncedValue<Key extends keyof State>(
    key: Key,
    when: Accessor<boolean>,
    value: Accessor<State[Key]>,
  ) {
    this.registerDerived(key, () => (when() ? value() : UNSET), false);
  }

  /**
   * Derives a key from the raw state (the value written imperatively) and other reactive
   * values, e.g. a fallback while nothing was written. Imperative writes go to the raw state.
   * `derive` also receives how many writes the key had, to tell a write of the same raw value
   * apart from no write. It runs whenever its inputs change (the store's change notification
   * reads it), so it may keep state across runs, e.g. to detect an open/close transition.
   */
  useDerivedState<Key extends keyof State>(
    key: Key,
    derive: (rawValue: State[Key], rawState: State, writes: number) => State[Key],
  ) {
    this.registerDerived(key, NOOP_SOURCE, false, derive as DerivedKey['derive']);
  }

  /**
   * Resets a key from reactive state, the way an effect that writes it on a change would, but
   * derived, so readers see the reset in the same flush. When `reset` returns `{ value }`, the key
   * reads that value until the next imperative write. `undefined` doesn't reset it: the key keeps
   * reading what it read.
   *
   * A reset happens when `reset` returns a value different from its last one (`undefined` in
   * between counts, so closing and reopening resets to the same value again). Options:
   * - `everyRun`: every run of `reset` that returns a value is a reset, even to the same value.
   * - `hold`: while `reset` returns a value, writes don't change the key.
   *
   * Returns the last reset (a new object for each one), e.g. to notify about it.
   */
  useResetState<Key extends keyof State>(
    key: Key,
    reset: () => { value: State[Key] } | undefined,
    options: { everyRun?: boolean | undefined; hold?: boolean | undefined } = {},
  ): Accessor<{ value: State[Key] } | undefined> {
    // Each reset gets an id, so a reset to the same value is told apart from no reset.
    const resets = createMemo<ResetEvent<State[Key]>>((previous) => {
      const next = reset();
      if (
        next !== undefined &&
        (options.everyRun ||
          previous?.current === undefined ||
          !Object.is(next.value, previous.current.value))
      ) {
        return { current: next, last: next, id: (previous?.id ?? 0) + 1 };
      }
      if (previous === undefined) {
        return { current: next, last: undefined, id: 0 };
      }
      return next === undefined && previous.current === undefined
        ? previous
        : { current: next, last: previous.last, id: previous.id };
    });

    let appliedId = 0;
    let writesAtReset = -1;
    this.useDerivedState(key, (raw, _, writes) => {
      const { current, last, id } = resets();
      if (id !== appliedId) {
        appliedId = id;
        writesAtReset = writes;
      }
      if (options.hold && current !== undefined) {
        // A write while held is dropped, not kept for later.
        writesAtReset = writes;
        return current.value;
      }
      return last !== undefined && writes === writesAtReset ? last.value : raw;
    });

    return createMemo(() => resets().last);
  }

  /** Sources of the derived keys. The last registration of a key wins. */
  declare private derived: Map<keyof State, DerivedKey[]> | undefined;

  /** Bumped when a registration changes which value a key derives from. */
  declare private derivedVersion: Signal<number> | undefined;

  /** The snapshot of the current raw state, rebuilt when it or the registrations change. */
  declare private snapshot: { raw: State; registrations: number; view: State } | undefined;

  /** Changes on every registration, so the snapshot gets the new keys' getters. */
  declare private registrations: number | undefined;

  /**
   * The raw state with the derived keys applied as getters. Reading a derived key in a
   * reactive scope tracks its source, so a reader only depends on the keys it reads. The snapshot
   * is replaced when the raw state changes (like upstream), not when only a derived value does:
   * memoized selectors over derived keys would return stale results (none exist in the library).
   */
  override get state(): State {
    const raw = super.state;
    const derived = this.derived;
    // Registrations change which values the keys derive from, so selectors track them, also
    // before the first registration.
    const tracked = getObserver() !== null && isTrackingState();
    if (tracked) {
      this.getDerivedVersion()[0]();
    }
    if (derived === undefined || derived.size === 0) {
      return raw;
    }

    const previous = this.snapshot;
    const registrations = this.registrations ?? 0;
    if (
      previous !== undefined &&
      previous.raw === raw &&
      previous.registrations === registrations
    ) {
      return previous.view;
    }

    const view = { ...raw };
    for (const key of derived.keys()) {
      const read = () => {
        const entries = derived.get(key);
        return entries === undefined ? raw[key] : resolveDerived(entries, raw, key).value;
      };
      Object.defineProperty(view, key, {
        configurable: true,
        enumerable: true,
        get() {
          // Like upstream's plain state object, a read is a snapshot unless it's made by a
          // `useStore` selector.
          return getObserver() !== null && isTrackingState() ? read() : untrack(read);
        },
      });
    }
    this.snapshot = { raw, registrations, view };
    return view;
  }

  override set state(next: State) {
    const derived = this.derived;
    if (derived !== undefined && derived.size > 0) {
      // An imperative write to a derived key wins until its source changes.
      const current = untrack(() => this.state);
      for (const [key, entries] of derived) {
        if (!Object.is(next[key], current[key])) {
          const entry = untrack(() => resolveDerived(entries, super.state, key));
          if (entry.derive !== undefined) {
            // The derivation reads the raw value. Count the write, so it can tell a write of the
            // same raw value apart from no write.
            entry.writes = (entry.writes ?? 0) + 1;
            continue;
          }
          const source = untrack(entry.source);
          if (source !== UNSET) {
            entry.override = {
              value: next[key],
              source: entry.overrideSource === undefined ? source : untrack(entry.overrideSource),
            };
          }
        }
      }
    }
    super.state = next;
  }

  /**
   * Notifies the listeners outside Solid (`subscribe`, `observe`) once when any of the keys
   * changes. Solid accessors track the sources themselves.
   */
  private notifyOnChange(keys: (keyof State)[], initialValues: unknown[]) {
    // eslint-disable-next-line consistent-this
    const store = this;
    let previousValues = initialValues;
    useIsoLayoutEffect(
      ([values]) => {
        if (values.some((value, index) => !Object.is(value, previousValues[index]))) {
          previousValues = values;
          store.notifyUntrackedListeners();
        }
      },
      () => [runWithTrackedState(() => keys.map((key) => store.state[key]))] as const,
      IS_DEV ? debugName(store, 'derived', keys.join(',')) : undefined,
    );
  }

  private getDerivedVersion() {
    this.derivedVersion ??= createSignal(
      0,
      IS_DEV
        ? { ownedWrite: true, name: `${getStoreDebugName(this)}.derivedVersion` }
        : { ownedWrite: true },
    );
    return this.derivedVersion;
  }

  private registerDerived<Key extends keyof State>(
    key: Key,
    source: Accessor<unknown>,
    clearOnCleanup: boolean,
    derive?: DerivedKey['derive'],
    notify = true,
    overrideSource?: Accessor<unknown>,
  ) {
    // eslint-disable-next-line consistent-this
    const store = this;
    store.derived ??= new Map<keyof State, DerivedKey[]>();
    const derived = store.derived;
    const version = store.getDerivedVersion();

    // The value before the registration: subscribers are notified if the registration changes it.
    const before = untrack(() => store.state[key]);
    const entry: DerivedKey = { source, derive, overrideSource, stamp: 0 };
    let entries = derived.get(key);
    if (entries === undefined) {
      entries = [];
      derived.set(key, entries);
    }
    entries.push(entry);
    store.registrations = (store.registrations ?? 0) + 1;
    // Selectors that already read the key re-run, so they track its source from now on. Only
    // `useStore` selectors track the store, so this can't re-run the component that registers.
    version[1]((value) => value + 1);

    if (notify) {
      store.notifyOnChange([key], [before]);
    }

    onCleanup(() => {
      const previous = untrack(() => store.state[key]);
      const remaining = derived.get(key)!.filter((item) => item !== entry);
      if (remaining.length === 0) {
        derived.delete(key);
      } else {
        derived.set(key, remaining);
      }
      store.registrations = (store.registrations ?? 0) + 1;
      // Keep the last value in the raw state (like upstream's synced value), or clear it.
      const raw = untrack(() => super.state);
      super.state = { ...raw, [key]: clearOnCleanup ? undefined : previous };
      if (
        !Object.is(
          untrack(() => store.state[key]),
          previous,
        )
      ) {
        version[1]((value) => value + 1);
        store.notifyUntrackedListeners();
      }
    });
  }
  /**
   * Registers a controllable prop pair (`controlled`, `defaultValue`) for a specific key. If `controlled`
   * is non-undefined, the store's state at `key` is updated to match `controlled`.
   */
  useControlledProp<Key extends keyof State>(
    key: Key,
    controlled: Accessor<State[Key] | undefined>,
  ): void {
    // eslint-disable-next-line consistent-this
    const store = this;
    // Port note: derived while controlled, see `useSyncedValue`. Uncontrolled, the raw state is used.
    store.registerDerived(
      key,
      () => {
        const controlledValue = controlled();
        return controlledValue === undefined ? UNSET : controlledValue;
      },
      false,
    );

    if (IS_DEV) {
      // eslint-disable-next-line
      const cache = ((this as any).controlledValues ??= new Map<keyof State, boolean>());
      useIsoLayoutEffect(
        ([isControlled]) => {
          if (!cache.has(key)) {
            cache.set(key, isControlled);
          }
          const previouslyControlled = cache.get(key);
          if (previouslyControlled !== undefined && previouslyControlled !== isControlled) {
            console.error(
              `A component is changing the ${
                previouslyControlled ? '' : 'un'
              }controlled state of ${key.toString()} to be ${previouslyControlled ? 'un' : ''}controlled. Elements should not switch from uncontrolled to controlled (or vice versa).`,
            );
          }
        },
        () => [controlled() !== undefined],
        `${debugName(store, 'useControlledProp', key)}.check`,
      );
    }
  }

  /** Gets the current value from the store using a selector with the provided key.
   * The read is not tracked: use {@link useState} to subscribe.
   *
   * @param key Key of the selector to use.
   */
  select<Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): ReturnType<Selectors[Key]>;

  select(key: keyof Selectors, a1?: unknown, a2?: unknown, a3?: unknown) {
    const selector = this.selectors![key];
    return selector(this.state, a1, a2, a3);
  }

  /**
   * Returns a value from the store's state using a selector function.
   * Used to subscribe to specific parts of the state.
   *
   * Port note: returns an accessor that updates whenever the selected state changes.
   * Arguments may be accessors.
   *
   * @param key Key of the selector to use.
   */
  useState<Key extends keyof Selectors>(
    key: Key,
    ...args: MaybeAccessorArgs<SelectorArgs<Selectors[Key]>>
  ): Accessor<ReturnType<Selectors[Key]>>;

  useState(key: keyof Selectors, ...args: any[]): Accessor<any> {
    const [a1, a2, a3] = args;
    return useStore(this, this.selectors![key] as any, a1, a2, a3);
  }

  /**
   * Assigns a function to the context. The context function always calls the latest value
   * returned by `fn`, so it has a stable reference.
   *
   * Port note: takes an accessor returning the callback (`() => props.onOpenChange`), read
   * (untracked) on every call, in place of upstream's `useStableCallback`.
   *
   * @param key Key of the event callback. Must be a function in the context.
   * @param fn Accessor returning the function to call.
   */
  useContextCallback<Key extends ContextFunctionKeys<Context>>(
    key: Key,
    fn: Accessor<ContextFunction<Context, Key> | undefined>,
  ) {
    // Port note: a context command is imperative, including when invoked by a DOM ref.
    // Its callback reads intentionally do not subscribe to the caller's reactive scope.
    const stableFunction = ((...args: any[]) =>
      untrack(() => (fn() ?? NOOP)(...args))) as ContextFunction<Context, Key>;
    (this.context as Record<Key, ContextFunction<Context, Key>>)[key] = stableFunction;
  }

  /**
   * Returns a stable setter function for a specific key in the store's state.
   * It's commonly used to pass as a ref callback to Solid elements.
   *
   * @param key Key of the state to set.
   */
  useStateSetter<const Key extends keyof State>(key: Key) {
    return (value: State[Key]) => {
      this.set(key, value);
    };
  }

  /**
   * Observes changes derived from the store's selectors and calls the listener when the selected value changes.
   *
   * @param key Key of the selector to observe.
   * @param listener Listener function called when the selector result changes.
   */
  observe<Key extends keyof Selectors>(
    selector: Key,
    listener: (
      newValue: ReturnType<Selectors[Key]>,
      oldValue: ReturnType<Selectors[Key]>,
      store: this,
    ) => void,
  ): () => void;

  observe<Selector extends ObserveSelector<State>>(
    selector: Selector,
    listener: (newValue: ReturnType<Selector>, oldValue: ReturnType<Selector>, store: this) => void,
  ): () => void;

  observe(
    selector: keyof Selectors | ObserveSelector<State>,
    listener: (newValue: any, oldValue: any, store: this) => void,
  ) {
    let selectFn: ObserveSelector<State>;

    if (typeof selector === 'function') {
      selectFn = selector;
    } else {
      selectFn = this.selectors![selector] as ObserveSelector<State>;
    }

    let prevValue = selectFn(this.state);

    listener(prevValue, prevValue, this);

    return this.subscribe((nextState) => {
      const nextValue = selectFn(nextState);
      if (!Object.is(prevValue, nextValue)) {
        const oldValue = prevValue;
        prevValue = nextValue;
        listener(nextValue, oldValue, this);
      }
    });
  }
}

let nextStamp = 0;

interface ResetEvent<Value> {
  /** What `reset` returned on its last run. */
  current: { value: Value } | undefined;
  /** The last reset. */
  last: { value: Value } | undefined;
  /** Increases with each reset. */
  id: number;
}

interface DerivedKey {
  source: Accessor<unknown>;
  /**
   * What an imperative write is kept against (defaults to the source's value). Keys synced
   * together share their group's value, so a write is kept until any of them changes, like
   * upstream's single effect that re-syncs all of them.
   */
  overrideSource?: Accessor<unknown> | undefined;
  derive?: ((rawValue: any, rawState: any, writes: number) => unknown) | undefined;
  /** The number of imperative writes to a derived (`derive`) key. */
  writes?: number | undefined;
  /** An imperative write, kept while the source still has the value it had then. */
  override?: { value: unknown; source: unknown } | undefined;
  /** The last controlled value, kept after the source becomes `UNSET` until the raw state changes. */
  last?: { value: unknown; raw: unknown } | undefined;
  /** Increases when the source changes: the most recently changed registration wins. */
  stamp: number;
  value?: unknown;
  /** The source's value (or the derived value) at the last read, and the one before it. */
  observed?: unknown;
  previousObserved?: unknown;
}

function readEntry(entry: DerivedKey, rawState: any, key: PropertyKey) {
  const rawValue = rawState[key];
  if (entry.derive !== undefined) {
    const derived = entry.derive(rawValue, rawState, entry.writes ?? 0);
    entry.observed = derived;
    return derived;
  }
  let value = entry.source();
  entry.observed = value;
  if (value === UNSET) {
    if (entry.last !== undefined && Object.is(entry.last.raw, rawValue)) {
      return entry.last.value;
    }
    entry.last = undefined;
    return rawValue;
  }
  if (entry.override !== undefined) {
    const overrideSource = entry.overrideSource === undefined ? value : entry.overrideSource();
    if (Object.is(entry.override.source, overrideSource)) {
      value = entry.override.value;
    } else {
      entry.override = undefined;
    }
  }
  entry.last = { value, raw: rawValue };
  return value;
}

/**
 * Reads every registration of a key (so a reactive reader tracks all of them) and returns the one
 * whose source changed last, like upstream where the last effect to write the key wins. A source
 * that becomes active again counts as a change, even if it brings back the value it kept. An
 * inactive source (`UNSET`) doesn't write: it only wins (keeping its last value) when no source
 * is active.
 */
function resolveDerived(entries: DerivedKey[], rawState: any, key: PropertyKey) {
  let winner: DerivedKey | undefined;
  let winnerActive = false;
  for (const entry of entries) {
    entry.value = readEntry(entry, rawState, key);
    const observed = entry.observed;
    const active = observed !== UNSET;
    if (active && (entry.stamp === 0 || !Object.is(observed, entry.previousObserved))) {
      nextStamp += 1;
      entry.stamp = nextStamp;
    }
    entry.previousObserved = observed;
    if (
      winner === undefined ||
      (active && !winnerActive) ||
      (active === winnerActive && entry.stamp >= winner.stamp)
    ) {
      winner = entry;
      winnerActive = active;
    }
  }
  return winner!;
}

/**
 * Dev-only label of a synchronization effect, e.g. `BaseUI.Store(PopoverStore).useSyncedValue(open)`
 * (see `storeDebugName.ts`).
 */
function debugName(store: object, method: string, key?: PropertyKey) {
  return `${getStoreDebugName(store)}.${method}${key === undefined ? '' : `(${String(key)})`}`;
}

function haveSameValues(a: object, b: object) {
  const aValues = Object.values(a);
  const bValues = Object.values(b);
  return (
    aValues.length === bValues.length &&
    aValues.every((value, index) => Object.is(value, bValues[index]))
  );
}

type MaybeCallable = (...args: any[]) => any;

type ContextFunctionKeys<Context> = {
  [Key in keyof Context]-?: Extract<Context[Key], MaybeCallable> extends never ? never : Key;
}[keyof Context];

type ContextFunction<Context, Key extends keyof Context> = Extract<Context[Key], MaybeCallable>;

type KeysAllowingUndefined<State> = {
  [Key in keyof State]-?: undefined extends State[Key] ? Key : never;
}[keyof State];

type ObserveSelector<State> = (state: State) => any;

type SelectorFunction<State> = (state: State, ...args: any[]) => any;

/** `useSyncedValues`' record form: one accessor per key. */
type SyncedValueAccessors<State, Key extends keyof State> = {
  [K in Key]: Accessor<State[K] | typeof UNSET>;
} & {
  // Not a function, so an accessor of the object form doesn't match this form with no keys.
  call?: never | undefined;
  apply?: never | undefined;
};

/** The values synchronized by `useSyncedValues`: each may be `SolidStore.KEEP`. */
type SyncedValues<State, Key extends keyof State> = {
  [K in Key]: State[K] | typeof UNSET;
};

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
  ? Tail<Params>
  : never;
