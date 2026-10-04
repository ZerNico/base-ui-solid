import { createContext, useContext } from 'solid-js';
import type { DialogStore } from '../store/DialogStore';

export const DialogRootContext = createContext<DialogStore<unknown> | null>(null);

export function useDialogRootContext(optional?: false): DialogStore<unknown>;
export function useDialogRootContext(optional: true): DialogStore<unknown> | undefined;
export function useDialogRootContext(optional?: boolean) {
  const store = useContext(DialogRootContext) ?? undefined;

  if (!optional && store === undefined) {
    throw new Error(
      'Base UI: DialogRootContext is missing. Dialog parts must be placed within <Dialog.Root>.',
    );
  }

  return store;
}
