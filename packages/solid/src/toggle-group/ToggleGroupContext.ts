import { type Accessor, createContext, useContext } from 'solid-js';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../internals/reasons';

export interface ToggleGroupContext<Value> {
  value: Accessor<readonly Value[]>;
  setGroupValue: (
    newValue: Value,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  disabled: Accessor<boolean>;
  /**
   * Indicates whether the value has been initialized via `value` or `defaultValue` props.
   * Used to determine if Toggle should warn users about data inconsistency problems.
   */
  isValueInitialized: Accessor<boolean>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const ToggleGroupContext = createContext<ToggleGroupContext<any> | null>(null);

export function useToggleGroupContext<Value>() {
  return (useContext(ToggleGroupContext) ?? undefined) as ToggleGroupContext<Value> | undefined;
}
