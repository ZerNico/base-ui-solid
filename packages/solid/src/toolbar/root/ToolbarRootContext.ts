import { type Accessor, createContext, useContext } from 'solid-js';
import type { Orientation } from '../../internals/types';

export interface ToolbarRootContext {
  disabled: Accessor<boolean>;
  orientation: Accessor<Orientation>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const ToolbarRootContext = createContext<ToolbarRootContext | null>(null);

export function useToolbarRootContext(optional?: false): ToolbarRootContext;
export function useToolbarRootContext(optional: true): ToolbarRootContext | undefined;
export function useToolbarRootContext(optional?: boolean) {
  const context = useContext(ToolbarRootContext) ?? undefined;
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: ToolbarRootContext is missing. Toolbar parts must be placed within <Toolbar.Root>.',
    );
  }

  return context;
}
