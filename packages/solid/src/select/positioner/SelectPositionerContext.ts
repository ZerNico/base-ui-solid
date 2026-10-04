import { createContext, useContext } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { Side, UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';

/**
 * Port note: like `UseAnchorPositioningReturnValue`, the reactive fields are getters (read them in a
 * reactive scope and don't destructure them).
 */
export interface SelectPositionerContext extends Omit<UseAnchorPositioningReturnValue, 'side'> {
  side: 'none' | Side;
  alignItemWithTriggerActive: boolean;
  setControlledAlignItemWithTrigger: (value: boolean | ((prev: boolean) => boolean)) => void;
  scrollUpArrowRef: RefObject<HTMLDivElement | null>;
  scrollDownArrowRef: RefObject<HTMLDivElement | null>;
}

export const SelectPositionerContext = createContext<SelectPositionerContext | null>(null);

export function useSelectPositionerContext() {
  const context = useContext(SelectPositionerContext);
  if (!context) {
    throw new Error(
      'Base UI: SelectPositionerContext is missing. SelectPositioner parts must be placed within <Select.Positioner>.',
    );
  }
  return context;
}
