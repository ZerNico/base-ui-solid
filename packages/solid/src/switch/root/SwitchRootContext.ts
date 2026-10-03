import { type Accessor, createContext, useContext } from 'solid-js';
import type { SwitchRootState } from './SwitchRoot';

// Port note: the context holds an accessor to the root state instead of a snapshot.
export type SwitchRootContext = Accessor<SwitchRootState>;

export const SwitchRootContext = createContext<SwitchRootContext | null>(null);

export function useSwitchRootContext() {
  const context = useContext(SwitchRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: SwitchRootContext is missing. Switch parts must be placed within <Switch.Root>.',
    );
  }

  return context;
}
