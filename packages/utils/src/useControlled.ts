import { createEffect, createMemo, createSignal, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { error } from './error';
import { IS_DEV } from './isDev';

export interface UseControlledProps<T = unknown> {
  /**
   * Holds the component value when it's controlled.
   */
  controlled: Accessor<T | undefined>;
  /**
   * The default value when uncontrolled, and the fallback if a controlled value later becomes `undefined`.
   * Read once, like React's initial state. Pass it as a getter (`get default() { … }`) to get
   * upstream's dev warning when it changes after initialization.
   */
  default: T | undefined;
  /**
   * The component name displayed in warnings.
   */
  name: string;
  /**
   * The name of the state variable displayed in warnings.
   */
  state?: string | undefined;
}

export type ControlledSetter<T> = (newValue: T | ((prev: T) => T)) => void;

// A defined default guarantees a defined value. Otherwise, preserve `undefined`.
export function useControlled<T = unknown>(
  props: Omit<UseControlledProps<T>, 'default'> & { default: T },
): [Accessor<T>, ControlledSetter<T>];
export function useControlled<T = unknown>(
  props: UseControlledProps<T>,
): [Accessor<T | undefined>, ControlledSetter<T | undefined>];
export function useControlled<T = unknown>(
  props: UseControlledProps<T>,
): [Accessor<T | undefined>, ControlledSetter<T | undefined>] {
  // Port note: `props` isn't destructured so that `default` can be a getter that is read lazily
  // by the dev-only default-change warning below.
  const { controlled, name, state = 'value' } = props;
  const defaultProp = untrack(() => props.default);
  // The controlled mode is decided once, on creation.
  const isControlled = untrack(controlled) !== undefined;
  // Values are boxed so function values aren't mistaken for Solid's compute/updater forms.
  const [valueState, setValueState] = createSignal<{ value: T | undefined }>({
    value: defaultProp,
  });
  // Keep the initial mode, but use the initial default if a controlled value disappears.
  const value = createMemo(() => {
    const controlledValue = controlled();
    return isControlled && controlledValue !== undefined ? controlledValue : valueState().value;
  });

  if (IS_DEV) {
    createEffect(
      () => controlled() !== undefined,
      (isNowControlled) => {
        if (isControlled !== isNowControlled) {
          error(
            [
              `A component is changing the ${
                isControlled ? '' : 'un'
              }controlled ${state} state of ${name} to be ${isControlled ? 'un' : ''}controlled.`,
              'Elements should not switch from uncontrolled to controlled (or vice versa).',
              `Decide between using a controlled or uncontrolled ${name} ` +
                'element for the lifetime of the component.',
              "The nature of the state is determined during the first render. It's considered controlled if the value is not `undefined`.",
            ].join('\n'),
          );
        }
      },
    );

    const defaultValue = serializeToDevModeString(defaultProp);

    createEffect(
      () => props.default,
      (currentDefault) => {
        if (!isControlled && defaultValue !== serializeToDevModeString(currentDefault)) {
          error(
            [
              `A component is changing the default ${state} state of an uncontrolled ${name} after being initialized. ` +
                `To suppress this warning opt to use a controlled ${name}.`,
            ].join('\n'),
          );
        }
      },
    );
  }

  const setValueIfUncontrolled: ControlledSetter<T | undefined> = (newValue) => {
    if (!isControlled) {
      setValueState((prev) => ({
        value:
          typeof newValue === 'function'
            ? (newValue as (prev: T | undefined) => T | undefined)(prev.value)
            : newValue,
      }));
    }
  };

  return [value, setValueIfUncontrolled];
}

function serializeToDevModeString(input: unknown) {
  let nextId = 0;
  const seen = new WeakMap<object, number>();

  try {
    const result = JSON.stringify(input, function replacer(key, value) {
      if (key === '_owner' && this != null && typeof this === 'object' && '$$typeof' in this) {
        return undefined;
      }

      if (typeof value === 'bigint') {
        return `__bigint__:${value}`;
      }

      if (value !== null && typeof value === 'object') {
        const id = seen.get(value);
        if (id !== undefined) {
          return `__object__:${id}`;
        }

        seen.set(value, nextId);
        nextId += 1;
      }

      return value;
    });

    return result ?? `__top__:${typeof input}`;
  } catch {
    return '__unserializable__';
  }
}
