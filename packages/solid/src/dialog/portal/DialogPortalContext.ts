import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

/**
 * Port note: holds an accessor of `keepMounted` (upstream: the value).
 */
export const DialogPortalContext = createContext<Accessor<boolean> | null>(null);

export function useDialogPortalContext() {
  const value = useContext(DialogPortalContext) ?? undefined;
  if (value === undefined) {
    throw new Error('Base UI: <Dialog.Portal> is missing.');
  }
  return value;
}
