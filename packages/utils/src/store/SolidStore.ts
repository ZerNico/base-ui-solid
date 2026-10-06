import { createMemo, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { Store } from './Store';
import { useStore } from './useStore';
import type { MaybeAccessorArgs } from './useStore';
import { useIsoLayoutEffect } from '../useIsoLayoutEffect';
import { NOOP } from '../empty';
import { IS_DEV } from '../isDev';
import { getStoreDebugName } from './storeDebugName';

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
      IS_DEV ? debugName(store, 'useSyncedValue', key) : undefined,
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
      IS_DEV ? debugName(store, 'useSyncedValueWithCleanup', key) : undefined,
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
      IS_DEV
        ? { equals: haveSameValues, name: `${debugName(store, 'useSyncedValues')}.part` }
        : { equals: haveSameValues },
    );

    useIsoLayoutEffect(
      ([nextPart]) => {
        store.update(nextPart);
      },
      () => [part()],
      IS_DEV ? debugName(store, 'useSyncedValues') : undefined,
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
      IS_DEV ? debugName(store, 'useControlledProp', key) : undefined,
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

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
  ? Tail<Params>
  : never;
