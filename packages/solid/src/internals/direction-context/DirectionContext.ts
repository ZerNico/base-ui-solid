import { type Accessor, createContext, useContext } from 'solid-js';

export type TextDirection = 'ltr' | 'rtl';

export type DirectionContext = {
  direction: Accessor<TextDirection>;
};

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const DirectionContext = createContext<DirectionContext | null>(null);

/**
 * Returns an accessor for the current text direction.
 * Port note: upstream returns the value; Solid needs an accessor to stay reactive.
 */
export function useDirection(): Accessor<TextDirection> {
  const context = useContext(DirectionContext);

  return () => context?.direction() ?? 'ltr';
}
