import { createContext, useContext } from 'solid-js';
import type { PopoverStore } from '../store/PopoverStore';

export type PopoverRootContext<Payload = unknown> = PopoverStore<Payload>;

// Solid treats an `undefined` default as "no default" (reading it without a provider throws),
// so `null` stands in for upstream's `undefined` default.
export const PopoverRootContext = createContext<PopoverRootContext | null>(null);

export function usePopoverRootContext(optional?: false): PopoverRootContext;
export function usePopoverRootContext(optional: true): PopoverRootContext | undefined;
export function usePopoverRootContext(optional?: boolean) {
  const context = useContext(PopoverRootContext) ?? undefined;
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: PopoverRootContext is missing. Popover parts must be placed within <Popover.Root>.',
    );
  }
  return context;
}
