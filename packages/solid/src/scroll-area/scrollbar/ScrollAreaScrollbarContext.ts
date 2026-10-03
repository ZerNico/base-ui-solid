import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

// Port note: the orientation is provided as an accessor so it stays reactive.
export type ScrollAreaScrollbarContext = Accessor<'horizontal' | 'vertical'>;

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const ScrollAreaScrollbarContext = createContext<ScrollAreaScrollbarContext | null>(null);

export function useScrollAreaScrollbarContext() {
  const context = useContext(ScrollAreaScrollbarContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: ScrollAreaScrollbarContext is missing. ScrollAreaScrollbar parts must be placed within <ScrollArea.Scrollbar>.',
    );
  }
  return context;
}
