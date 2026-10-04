import { createContext, useContext } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';
import type { ToastObject } from '../useToastManager';

/**
 * Port note: `toast`, `visibleIndex` and `expanded` are accessors.
 */
export interface ToastRootContext {
  toast: Accessor<ToastObject<any>>;
  setTitleId: Setter<string | undefined>;
  setDescriptionId: Setter<string | undefined>;
  visibleIndex: Accessor<number>;
  expanded: Accessor<boolean>;
  recalculateHeight: (flushSync?: boolean) => void;
}

export const ToastRootContext = createContext<ToastRootContext | null>(null);

export function useToastRootContext(): ToastRootContext {
  const context = useContext(ToastRootContext);
  if (!context) {
    throw new Error(
      'Base UI: ToastRootContext is missing. Toast parts must be used within <Toast.Root>.',
    );
  }
  return context as ToastRootContext;
}
