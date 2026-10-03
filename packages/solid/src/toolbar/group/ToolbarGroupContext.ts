import { type Accessor, createContext, useContext } from 'solid-js';

// TODO(port): the rest of `toolbar` is not ported yet; ToggleGroup reads this context.
export interface ToolbarGroupContext {
  disabled: Accessor<boolean>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const ToolbarGroupContext = createContext<ToolbarGroupContext | null>(null);

export function useToolbarGroupContext(): ToolbarGroupContext | undefined {
  return useContext(ToolbarGroupContext) ?? undefined;
}
