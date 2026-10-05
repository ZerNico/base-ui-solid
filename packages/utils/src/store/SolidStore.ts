import { createEffect, createMemo, createSignal, untrack } from 'solid-js';
import type { Accessor, Signal } from 'solid-js';
import { isServer } from '@solidjs/web';
import { Store } from './Store';
import { useStore } from './useStore';
import type { MaybeAccessorArgs } from './useStore';
import { useIsoLayoutEffect } from '../useIsoLayoutEffect';
import { NOOP } from '../empty';
import { IS_DEV } from '../isDev';
import { onCleanupWithWrites } from '../cleanup';

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
export class SolidStore<
  State extends object,
  Context = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
> extends Store<State> {
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
    this.sources = new Set();
    this.keySources = new Map();
    this.winners = new Map();
    this.snapshot = undefined;
    this.lastNotified = this.base;
    this.version = isServer
      ? undefined
      : createSignal(undefined, { equals: false, ownedWrite: true });
    this.trackingHandler = {
      get: (target, key) => {
        this.trackKey(key as keyof State);
        return target[key as keyof State];
      },
    };
  }

  /**
   * The state written imperatively (`setState`, `set`, `update`, the constructor).
   * Keys won by a registered source are overridden in the snapshot.
   */
  declare private base: State;

  /** Whether `base` got a new identity since the snapshot was built. */
  declare private baseChanged: boolean;

  /** Whether the snapshot must be rebuilt even if no source changed. */
  declare private dirty: boolean;

  /** Registered sources, in registration order. */
  declare private sources: Set<Source<State>>;

  /** Registered sources per key, for tracked reads of that key. */
  declare private keySources: Map<keyof State, Array<Source<State>>>;

  /** The source that currently provides each key. Keys missing here are provided by `base`. */
  declare private winners: Map<keyof State, Source<State>>;

  /** The current snapshot, kept until an effective value (or `base`) changes. */
  declare private snapshot: State | undefined;

  /** The snapshot passed to the subscribers last. */
  declare private lastNotified: State;

  /** Changes when `base` changes or a source registers or unregisters. Client only. */
  declare private version: Signal<undefined> | undefined;

  declare private trackingHandler: ProxyHandler<State & object>;

  /**
   * The current state of the store: the imperative state, with the keys provided by registered
   * sources read from them.
   *
   * Port note: upstream's `state` is a plain field written by `setState` and by the layout effects
   * of `useSyncedValue` & co. Here those hooks register their accessor as the source of the key
   * instead (see `register`), so the snapshot is resolved when read: imperative writes are visible
   * right away (like upstream), and synced values are visible as soon as Solid committed them,
   * also during server rendering. The snapshot keeps its identity until a value changes. The
   * read is not tracked: use `useState`/`useStore` (or `track()`) to subscribe.
   */
  // @ts-expect-error `Store` declares `state` as a field. The accessor replaces it, including for
  // `Store`'s constructor, which calls the setter.
  get state(): State {
    return untrack(() => this.resolve());
  }

  set state(value: State) {
    this.base = value;
    this.baseChanged = true;
    this.dirty = true;
  }

  /**
   * Updates the imperative state and notifies the subscribers. A key provided by a registered
   * source is taken over by the imperative state if `newState` changes its value, until the source
   * changes again (the last writer wins, like upstream's layout effects that only write when the
   * synced value changes).
   */
  setState(newState: State) {
    const current = this.state;
    if (current === newState) {
      return;
    }

    for (const key of this.winners.keys()) {
      if (!Object.is(newState[key], current[key])) {
        this.winners.delete(key);
      }
    }

    this.state = newState;
    this.bumpVersion();
    this.notify(this.state);
  }

  protected notify(newState: State) {
    this.lastNotified = newState;
    super.notify(newState);
  }

  /**
   * Returns the current state and, in a reactive scope, subscribes to it: to imperative changes,
   * to sources registering or unregistering, and to the sources of the keys read from the returned
   * object.
   *
   * Port note: Solid-only. `useStore` uses it in place of a `subscribe` listener, so a selected
   * value updates in the same flush as the synced value it's computed from.
   */
  track(): State {
    this.version?.[0]();
    const snapshot = this.state;
    if (this.version === undefined || this.sources.size === 0) {
      return snapshot;
    }
    // A new view each time, so memoized selectors (keyed by the state object) read the keys
    // again and every run tracks them.
    return new Proxy(snapshot as State & object, this.trackingHandler);
  }

  /**
   * Like `select`, but subscribes to the selected state when called in a reactive scope (see
   * `track`).
   */
  selectTracked<Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): ReturnType<Selectors[Key]>;

  selectTracked(key: keyof Selectors, a1?: unknown, a2?: unknown, a3?: unknown) {
    const selector = this.selectors![key];
    return selector(this.track(), a1, a2, a3);
  }

  /**
   * Makes `part` the source of its keys until the current owner is disposed.
   *
   * A registered source provides its keys (it "wins") when it registers and whenever its value
   * changes, until an imperative write changes one of them. With `undefinedFallsBack`, an
   * `undefined` value doesn't win, and a winning source that turns `undefined` hands its last value
   * to the imperative state (a controlled prop becoming uncontrolled). On disposal, a winning
   * source hands its last value (or `undefined` with `resetOnCleanup`) to the imperative state.
   *
   * Port note: Solid-only. This replaces the layout effects in which upstream's `useSyncedValue`,
   * `useSyncedValues`, `useSyncedValueWithCleanup` and `useControlledProp` write their values.
   *
   * @param part Accessor of the synced keys and values. Its identity must change only when a value
   * changes (a memo comparing the values). The keys are read once.
   */
  protected register<const Key extends keyof State>(
    part: Accessor<Pick<State, Key>>,
    options: RegisterOptions = {},
  ) {
    const source: Source<State> = {
      part: part as Accessor<Partial<State>>,
      keys: Object.keys(untrack(part)) as Array<keyof State>,
      seen: undefined,
      undefinedFallsBack: options.undefinedFallsBack ?? false,
      resetOnCleanup: options.resetOnCleanup ?? false,
    };

    this.sources.add(source);
    for (const key of source.keys) {
      let keySources = this.keySources.get(key);
      if (keySources === undefined) {
        keySources = [];
        this.keySources.set(key, keySources);
      }
      keySources.push(source);
    }
    this.dirty = true;
    this.bumpVersion();

    if (!isServer) {
      // Subscribers (`subscribe`, `observe`) are notified after the flush that committed the new
      // value, like upstream's layout effect notifies them after the render.
      createEffect(part, () => {
        this.notifyIfChanged();
      });
    }

    onCleanupWithWrites(() => {
      this.unregister(source);
    });
  }

  private unregister(source: Source<State>) {
    this.resolve();
    this.sources.delete(source);
    for (const key of source.keys) {
      const keySources = this.keySources.get(key)!;
      keySources.splice(keySources.indexOf(source), 1);
      if (keySources.length === 0) {
        this.keySources.delete(key);
      }
      if (this.winners.get(key) === source) {
        this.winners.delete(key);
        this.writeBase(
          key,
          source.resetOnCleanup ? (undefined as State[typeof key]) : source.seen![key]!,
        );
      }
    }
    this.dirty = true;
    this.bumpVersion();
    this.notifyIfChanged();
  }

  private notifyIfChanged() {
    const snapshot = this.state;
    if (snapshot !== this.lastNotified) {
      this.notify(snapshot);
    }
  }

  private bumpVersion() {
    this.version?.[1](undefined);
  }

  /**
   * Writes a key of the imperative state without changing the effective value (the key is handed
   * over from a source), so the snapshot keeps its identity.
   */
  private writeBase<Key extends keyof State>(key: Key, value: State[Key]) {
    this.base = { ...this.base, [key]: value };
    this.dirty = true;
  }

  private trackKey(key: keyof State) {
    const keySources = this.keySources.get(key);
    if (keySources !== undefined) {
      for (const source of keySources) {
        source.part();
      }
    }
  }

  private resolve(): State {
    let changed = this.dirty;

    for (const source of this.sources) {
      const part = source.part();
      if (part === source.seen) {
        continue;
      }
      const previous = source.seen;
      source.seen = part;
      changed = true;
      for (const key of source.keys) {
        if (source.undefinedFallsBack && part[key] === undefined) {
          if (this.winners.get(key) === source) {
            // Like upstream, a controlled value that becomes `undefined` keeps the last value.
            this.winners.delete(key);
            this.writeBase(key, previous![key]!);
          }
        } else {
          this.winners.set(key, source);
        }
      }
    }

    if (!changed && this.snapshot !== undefined) {
      return this.snapshot;
    }

    let next = this.base;
    for (const [key, source] of this.winners) {
      const value = source.seen![key];
      if (!Object.is(next[key], value)) {
        if (next === this.base) {
          next = { ...this.base };
        }
        next[key] = value!;
      }
    }

    if (
      !this.baseChanged &&
      this.snapshot !== undefined &&
      next !== this.snapshot &&
      haveSameEntries(next, this.snapshot)
    ) {
      next = this.snapshot;
    }

    this.snapshot = next;
    this.dirty = false;
    this.baseChanged = false;
    return next;
  }

  /**
   * Non-reactive values such as refs, callbacks, etc.
   */
  declare readonly context: Context;

  declare private selectors: Selectors | undefined;

  /**
   * Synchronizes a single external value into the store.
   *
   * Note that the while the value in `state` is updated immediately, the value returned
   * by `useState` is updated when Solid flushes (similarly to React's `useState`).
   */
  useSyncedValue<Key extends keyof State>(key: Key, value: Accessor<State[Key]>) {
    // eslint-disable-next-line consistent-this
    const store = this;
    useIsoLayoutEffect(
      ([nextValue]) => {
        if (store.state[key] !== nextValue) {
          store.set(key, nextValue);
        }
      },
      () => [value()],
    );
  }

  /**
   * Synchronizes a single external value into the store and
   * cleans it up (sets to `undefined`) on unmount.
   *
   * Note that the while the value in `state` is updated immediately, the value returned
   * by `useState` is updated when Solid flushes (similarly to React's `useState`).
   */
  public useSyncedValueWithCleanup<Key extends KeysAllowingUndefined<State>>(
    key: Key,
    value: Accessor<State[Key]>,
  ) {
    // eslint-disable-next-line consistent-this
    const store = this;
    useIsoLayoutEffect(
      ([nextValue]) => {
        if (store.state[key] !== nextValue) {
          store.set(key, nextValue);
        }

        return () => {
          store.set(key, undefined as State[Key]);
        };
      },
      () => [value()],
    );
  }

  /**
   * Synchronizes multiple external values into the store.
   * Each value must match its state key. Pass an exact known subset rather than a broad
   * `Partial<State>`, which may contain `undefined` for required state fields.
   *
   * Note that the while the values in `state` are updated immediately, the values returned
   * by `useState` are updated when Solid flushes (similarly to React's `useState`).
   *
   * Port note: takes an accessor returning the state part (`() => ({ a: a(), b: props.b })`).
   * Like upstream's effect dependencies (`[store, ...Object.values(statePart)]`), the store is
   * updated only when one of the values changed, not when only the object identity did.
   *
   * @param statePart An exact subset of state fields to synchronize. Unknown keys are not accepted.
   */
  public useSyncedValues<const Key extends keyof State>(statePart: Accessor<Pick<State, Key>>) {
    // eslint-disable-next-line consistent-this
    const store = this;
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
      { equals: haveSameValues },
    );

    useIsoLayoutEffect(
      ([nextPart]) => {
        store.update(nextPart);
      },
      () => [part()],
    );
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

    useIsoLayoutEffect(
      ([controlledValue, isControlled]) => {
        if (isControlled && !Object.is(store.state[key], controlledValue)) {
          // Set the internal state to match the controlled value.
          store.setState({ ...store.state, [key]: controlledValue });
        }
      },
      () => {
        const controlledValue = controlled();
        return [controlledValue, controlledValue !== undefined] as const;
      },
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
                isControlled ? '' : 'un'
              }controlled state of ${key.toString()} to be ${isControlled ? 'un' : ''}controlled. Elements should not switch from uncontrolled to controlled (or vice versa).`,
            );
          }
        },
        () => [controlled() !== undefined],
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

function haveSameEntries(a: object, b: object) {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) {
    return false;
  }
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      Object.is(a[key as keyof typeof a], b[key as keyof typeof b]),
  );
}

interface RegisterOptions {
  /** An `undefined` value doesn't win (a controlled prop that is uncontrolled). */
  undefinedFallsBack?: boolean | undefined;
  /** Hands `undefined` to the imperative state on disposal, instead of the last value. */
  resetOnCleanup?: boolean | undefined;
}

interface Source<State> {
  part: Accessor<Partial<State>>;
  keys: Array<keyof State>;
  /** The last value read by `resolve`. */
  seen: Partial<State> | undefined;
  undefinedFallsBack: boolean;
  resetOnCleanup: boolean;
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

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
  ? Tail<Params>
  : never;
