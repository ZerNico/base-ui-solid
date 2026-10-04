import { createContext, useContext } from 'solid-js';
import type { TooltipStore } from '../store/TooltipStore';

export type TooltipRootContext<Payload = unknown> = TooltipStore<Payload>;

export const TooltipRootContext = createContext<TooltipRootContext | null>(null);

export function useTooltipRootContext(optional?: false): TooltipRootContext;
export function useTooltipRootContext(optional: true): TooltipRootContext | undefined;
export function useTooltipRootContext(optional?: boolean) {
  const context = useContext(TooltipRootContext) ?? undefined;
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: TooltipRootContext is missing. Tooltip parts must be placed within <Tooltip.Root>.',
    );
  }

  return context;
}
