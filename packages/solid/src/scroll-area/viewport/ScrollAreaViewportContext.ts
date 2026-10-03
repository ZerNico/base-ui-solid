import { createContext, useContext } from 'solid-js';

export interface ScrollAreaViewportContext {
  computeThumbPosition: () => void;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const ScrollAreaViewportContext = createContext<ScrollAreaViewportContext | null>(null);

export function useScrollAreaViewportContext() {
  const context = useContext(ScrollAreaViewportContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: ScrollAreaViewportContext missing. ScrollAreaViewport parts must be placed within <ScrollArea.Viewport>.',
    );
  }
  return context;
}
