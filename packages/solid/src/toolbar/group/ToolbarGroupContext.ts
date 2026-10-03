import { type Accessor, createContext, useContext } from 'solid-js';

export interface ToolbarGroupContext {
  disabled: Accessor<boolean>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const ToolbarGroupContext = createContext<ToolbarGroupContext | null>(null);

export function useToolbarGroupContext(): ToolbarGroupContext | undefined {
  return useContext(ToolbarGroupContext) ?? undefined;
}
