import { createSignal, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { EMPTY_ARRAY } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../internals/reasons';

/**
 * Port note: `allValues` and `value` are accessors. `getParentProps` and `getChildProps` read
 * reactive state, so call them inside a reactive scope; the returned `onCheckedChange` handlers
 * read the latest values untracked.
 */
export function useCheckboxGroupParent(
  params: UseCheckboxGroupParentParameters,
): UseCheckboxGroupParentReturnValue {
  const allValues = () => params.allValues?.() ?? (EMPTY_ARRAY as string[]);
  const value = params.value;

  const uncontrolledStateRef: RefObject<string[]> = { current: untrack(value) };
  const disabledStatesRef: RefObject<Map<string, boolean>> = {
    current: new Map(),
  };

  const [status, setStatus] = createSignal<'on' | 'off' | 'mixed'>('mixed');
  // A `Map` rather than an object: checkbox values are consumer data, and a value like
  // `constructor` would otherwise read straight off `Object.prototype`.
  // Replace only the wrapper to rerender without cloning the growing registry.
  const childIds = new Map<string, readonly string[]>();
  const [childIdsState, setChildIdsState] = createSignal({ registry: childIds }, { equals: false });

  const onValueChange: NonNullable<UseCheckboxGroupParentParameters['onValueChange']> = (
    nextValue,
    eventDetails,
  ) => params.onValueChange?.(nextValue, eventDetails);

  const registerChildId = (childValue: string, childId: string) => {
    childIds.set(childValue, (childIds.get(childValue) ?? EMPTY_ARRAY).concat(childId));
    setChildIdsState({ registry: childIds });

    return () => {
      const nextIds = (childIds.get(childValue) ?? EMPTY_ARRAY).filter((id) => id !== childId);
      if (nextIds.length === 0) {
        childIds.delete(childValue);
      } else {
        childIds.set(childValue, nextIds);
      }
      setChildIdsState({ registry: childIds });
    };
  };

  const getParentProps: UseCheckboxGroupParentReturnValue['getParentProps'] = () => {
    const currentValue = value();
    const currentAllValues = allValues();
    const registry = childIdsState().registry;

    return {
      indeterminate: currentValue.length !== currentAllValues.length && currentValue.length > 0,
      checked: currentValue.length === currentAllValues.length,
      // Children report their own rendered id, so a custom `id` survives and no unmounted
      // element is named.
      'aria-controls':
        currentAllValues.flatMap((v) => registry.get(v) ?? EMPTY_ARRAY).join(' ') || undefined,
      onCheckedChange(_, eventDetails) {
        untrack(() => {
          const uncontrolledState = uncontrolledStateRef.current;
          const latestAllValues = allValues();
          const latestValue = value();

          // None except the disabled ones that are checked, which can't be changed.
          const none = latestAllValues.filter(
            (v) => disabledStatesRef.current.get(v) && uncontrolledState.includes(v),
          );
          // "All" that are valid:
          // - any that aren't disabled
          // - disabled ones that are checked
          const all = latestAllValues.filter(
            (v) => !disabledStatesRef.current.get(v) || uncontrolledState.includes(v),
          );

          const allOnOrOff =
            uncontrolledState.length === all.length || uncontrolledState.length === 0;

          if (allOnOrOff) {
            if (latestValue.length === all.length) {
              onValueChange(none, eventDetails);
            } else {
              onValueChange(all, eventDetails);
            }
            return;
          }

          let nextStatus: 'on' | 'off' | 'mixed' = 'mixed';
          let nextValue = uncontrolledState;

          const currentStatus = status();
          if (currentStatus === 'mixed') {
            nextStatus = 'on';
            nextValue = all;
          } else if (currentStatus === 'on') {
            nextStatus = 'off';
            nextValue = none;
          }

          onValueChange(nextValue, eventDetails);

          if (!eventDetails.isCanceled) {
            setStatus(nextStatus);
          }
        });
      },
    };
  };

  const getChildProps: UseCheckboxGroupParentReturnValue['getChildProps'] = (
    childValue: string,
  ) => ({
    checked: value().includes(childValue),
    onCheckedChange(nextChecked, eventDetails) {
      const newValue = untrack(value).slice();
      if (nextChecked) {
        newValue.push(childValue);
      } else {
        newValue.splice(newValue.indexOf(childValue), 1);
      }

      onValueChange(newValue, eventDetails);

      if (!eventDetails.isCanceled) {
        uncontrolledStateRef.current = newValue;
        setStatus('mixed');
      }
    },
  });

  return {
    getParentProps,
    getChildProps,
    registerChildId,
    disabledStatesRef,
  };
}

export interface UseCheckboxGroupParentParameters {
  allValues?: Accessor<string[] | undefined> | undefined;
  value: Accessor<string[]>;
  onValueChange?:
    | ((
        value: string[],
        eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
      ) => void)
    | undefined;
}

export interface UseCheckboxGroupParentReturnValue {
  disabledStatesRef: RefObject<Map<string, boolean>>;
  /**
   * Reports the `id` of the element a child checkbox exposes.
   */
  registerChildId: (value: string, id: string) => () => void;
  getParentProps: () => {
    indeterminate: boolean;
    checked: boolean;
    'aria-controls': string | undefined;
    onCheckedChange: (
      checked: boolean,
      eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
    ) => void;
  };
  getChildProps: (value: string) => {
    checked: boolean;
    onCheckedChange: (
      checked: boolean,
      eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
    ) => void;
  };
}
