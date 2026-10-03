import { createContext, useContext } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type {
  Coords,
  HiddenState,
  OverflowEdges,
  Size,
  ScrollAreaRootState,
} from './ScrollAreaRoot';

export interface ScrollAreaRootContext {
  cornerSize: Accessor<Size>;
  setCornerSize: Setter<Size>;
  thumbSize: Accessor<Size>;
  setThumbSize: Setter<Size>;
  hasMeasuredScrollbar: Accessor<boolean>;
  setHasMeasuredScrollbar: Setter<boolean>;
  touchModality: Accessor<boolean>;
  hovering: Accessor<boolean>;
  setHovering: Setter<boolean>;
  scrollingX: Accessor<boolean>;
  scrollingY: Accessor<boolean>;
  viewportRef: RefObject<HTMLDivElement | null>;
  scrollbarYRef: RefObject<HTMLDivElement | null>;
  thumbYRef: RefObject<HTMLDivElement | null>;
  scrollbarXRef: RefObject<HTMLDivElement | null>;
  thumbXRef: RefObject<HTMLDivElement | null>;
  cornerRef: RefObject<HTMLDivElement | null>;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
  handleScroll: (scrollPosition: Coords) => void;
  disableViewportSnap: () => void;
  rootId: string | undefined;
  hiddenState: Accessor<HiddenState>;
  setHiddenState: Setter<HiddenState>;
  overflowEdges: Accessor<OverflowEdges>;
  setOverflowEdges: Setter<OverflowEdges>;
  viewportState: Accessor<ScrollAreaRootState>;
  overflowEdgeThreshold: Accessor<{
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
  }>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const ScrollAreaRootContext = createContext<ScrollAreaRootContext | null>(null);

export function useScrollAreaRootContext() {
  const context = useContext(ScrollAreaRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: ScrollAreaRootContext is missing. ScrollArea parts must be placed within <ScrollArea.Root>.',
    );
  }
  return context;
}
