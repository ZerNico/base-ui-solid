import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';

// Port note: reactive values are exposed as accessors instead of render snapshots.
export interface NumberFieldScrubAreaContext {
  isScrubbing: Accessor<boolean>;
  isTouchInput: Accessor<boolean>;
  isPointerLockDenied: Accessor<boolean>;
  scrubAreaCursorRef: RefObject<HTMLSpanElement | null>;
}

export const NumberFieldScrubAreaContext = createContext<NumberFieldScrubAreaContext | null>(null);

export function useNumberFieldScrubAreaContext() {
  const context = useContext(NumberFieldScrubAreaContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: NumberFieldScrubAreaContext is missing. NumberFieldScrubArea parts must be placed within <NumberField.ScrubArea>.',
    );
  }
  return context;
}
