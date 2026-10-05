import { Show, createMemo, createSignal, omit } from 'solid-js';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { ScrollAreaRootContext } from './ScrollAreaRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { SCROLL_TIMEOUT } from '../constants';
import { getOffset } from '../utils/getOffset';
import { styleDisableScrollbar } from '../../utils/styles';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { scrollAreaStateAttributesMapping } from './stateAttributes';
import { contains } from '../../floating-ui-solid/utils';
import { useCSPContext } from '../../internals/csp-context/CSPContext';
import * as ScrollAreaRootCssVars from './ScrollAreaRootCssVars';
import * as ScrollAreaScrollbarDataAttributes from '../scrollbar/ScrollAreaScrollbarDataAttributes';

const DEFAULT_COORDS = { x: 0, y: 0 };
const DEFAULT_SIZE = { width: 0, height: 0 };
const DEFAULT_OVERFLOW_EDGES = { xStart: false, xEnd: false, yStart: false, yEnd: false };
const DEFAULT_HIDDEN_STATE = { x: true, y: true, corner: true };

export type HiddenState = typeof DEFAULT_HIDDEN_STATE;
export type OverflowEdges = typeof DEFAULT_OVERFLOW_EDGES;
export type Size = typeof DEFAULT_SIZE;
export type Coords = typeof DEFAULT_COORDS;

/**
 * Groups all parts of the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui-solid.pages.dev/solid/components/scroll-area)
 */
export function ScrollAreaRoot(componentProps: ScrollAreaRoot.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'overflowEdgeThreshold', 'style');

  const overflowEdgeThreshold = createMemo(
    () => normalizeOverflowEdgeThreshold(componentProps.overflowEdgeThreshold),
    {
      equals: (a, b) =>
        a.xStart === b.xStart && a.xEnd === b.xEnd && a.yStart === b.yStart && a.yEnd === b.yEnd,
    },
  );

  const rootId = useBaseUiId();

  const scrollYTimeout = useTimeout();
  const scrollXTimeout = useTimeout();

  const csp = useCSPContext();

  const [hovering, setHovering] = createSignal(false);
  const [scrollingX, setScrollingX] = createSignal(false);
  const [scrollingY, setScrollingY] = createSignal(false);
  const [touchModality, setTouchModality] = createSignal(false);
  const [hasMeasuredScrollbar, setHasMeasuredScrollbar] = createSignal(false);
  const [cornerSize, setCornerSize] = createSignal<Size>(DEFAULT_SIZE);
  const [thumbSize, setThumbSize] = createSignal<Size>(DEFAULT_SIZE);
  const [overflowEdges, setOverflowEdges] = createSignal(DEFAULT_OVERFLOW_EDGES);
  const [hiddenState, setHiddenState] = createSignal(DEFAULT_HIDDEN_STATE);

  let rootRef: HTMLDivElement | null = null;
  const viewportRef = { current: null as HTMLDivElement | null };
  const scrollbarYRef = { current: null as HTMLDivElement | null };
  const scrollbarXRef = { current: null as HTMLDivElement | null };
  const thumbYRef = { current: null as HTMLDivElement | null };
  const thumbXRef = { current: null as HTMLDivElement | null };
  const cornerRef = { current: null as HTMLDivElement | null };

  let activePointerId: number | null = null;
  let startY = 0;
  let startX = 0;
  let startScrollTop = 0;
  let startScrollLeft = 0;
  let currentOrientation: 'vertical' | 'horizontal' = 'vertical';
  let scrollPosition = DEFAULT_COORDS;
  let savedSnapType: string | null = null;

  function startScrolling(vertical: boolean) {
    const setScrolling = vertical ? setScrollingY : setScrollingX;
    const timeout = vertical ? scrollYTimeout : scrollXTimeout;

    setScrolling(true);
    timeout.start(SCROLL_TIMEOUT, () => {
      setScrolling(false);
    });
  }

  function handleScroll(nextScrollPosition: Coords) {
    const offsetX = nextScrollPosition.x - scrollPosition.x;
    const offsetY = nextScrollPosition.y - scrollPosition.y;

    scrollPosition = nextScrollPosition;

    if (offsetY !== 0) {
      startScrolling(true);
    }

    if (offsetX !== 0) {
      startScrolling(false);
    }
  }

  // CSS scroll snap forces every programmatic scroll to land on a snap
  // point, making thumb dragging jump between snap points. Native
  // scrollbars suppress snapping while dragging, so disable it until the
  // pointer is released; restoring the value re-snaps the viewport. The
  // save is guarded so a second pointer during an active drag can't
  // clobber the saved value with `none`.
  function disableViewportSnap() {
    const viewportEl = viewportRef.current;
    if (viewportEl && savedSnapType === null) {
      savedSnapType = viewportEl.style.scrollSnapType;
      viewportEl.style.scrollSnapType = 'none';
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }

    if (activePointerId !== null) {
      const activeThumb = currentOrientation === 'vertical' ? thumbYRef.current : thumbXRef.current;
      // A live drag holds capture for the active pointer — ignore other pointers.
      // No capture means the release went missing entirely (silent capture drop
      // with an id that never reappears, e.g. a lost touch contact), so let the
      // new pointer take over the latch instead of leaving dragging dead.
      if (activeThumb?.hasPointerCapture(activePointerId)) {
        return;
      }
    }

    activePointerId = event.pointerId;
    startY = event.clientY;
    startX = event.clientX;
    currentOrientation = (event.currentTarget as Element).getAttribute(
      ScrollAreaScrollbarDataAttributes.orientation,
    ) as 'vertical' | 'horizontal';

    const viewportEl = viewportRef.current;
    if (viewportEl) {
      startScrollTop = viewportEl.scrollTop;
      startScrollLeft = viewportEl.scrollLeft;
      disableViewportSnap();
    }

    const thumb = currentOrientation === 'vertical' ? thumbYRef.current : thumbXRef.current;
    thumb?.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent) {
    if (event.pointerId !== activePointerId) {
      return;
    }

    activePointerId = null;
    // Clear the drag's scrolling state immediately rather than waiting for the
    // `SCROLL_TIMEOUT` timer armed by the last drag move, so every release path
    // (real, `pointercancel`, or the missed-release fallback) behaves the same.
    (currentOrientation === 'vertical' ? setScrollingY : setScrollingX)(false);

    if (savedSnapType !== null) {
      if (viewportRef.current) {
        viewportRef.current.style.scrollSnapType = savedSnapType;
      }
      savedSnapType = null;
    }

    const thumb = currentOrientation === 'vertical' ? thumbYRef.current : thumbXRef.current;
    // `pointercancel` releases capture implicitly, so guard against releasing a
    // capture we no longer hold (which would throw).
    if (thumb?.hasPointerCapture(event.pointerId)) {
      thumb.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerId !== activePointerId) {
      return;
    }

    // The release can go missing entirely (e.g. the browser drops pointer
    // capture while the scrollbar is hidden mid-drag), leaving the drag
    // latched so a buttonless hover over the thumb scrolls the viewport.
    // Treat a move without the primary button held (`buttons` bit 1 unset)
    // as the missed release.
    if (event.buttons % 2 === 0) {
      handlePointerUp(event);
      return;
    }

    const viewportEl = viewportRef.current;
    if (!viewportEl) {
      return;
    }

    const vertical = currentOrientation === 'vertical';
    const thumbEl = vertical ? thumbYRef.current : thumbXRef.current;
    const scrollbarEl = vertical ? scrollbarYRef.current : scrollbarXRef.current;
    if (!thumbEl || !scrollbarEl) {
      return;
    }

    const axis = vertical ? 'y' : 'x';
    const scrollbarOffset = getOffset(scrollbarEl, 'padding', axis);
    const thumbOffset = getOffset(thumbEl, 'margin', axis);
    const thumbSizePx = vertical ? thumbEl.offsetHeight : thumbEl.offsetWidth;
    const trackSize = vertical ? scrollbarEl.offsetHeight : scrollbarEl.offsetWidth;
    const maxThumbOffset = trackSize - thumbSizePx - scrollbarOffset - thumbOffset;
    // A short or heavily padded track can drive `maxThumbOffset` to zero or
    // negative once the thumb hits its `MIN_THUMB_SIZE` floor. Dividing by it
    // would yield a non-finite (`Infinity`/`NaN`) or inverted scroll position.
    const delta = vertical ? event.clientY - startY : event.clientX - startX;
    const scrollRatio = maxThumbOffset <= 0 ? 0 : delta / maxThumbOffset;

    const scrollableSize = vertical ? viewportEl.scrollHeight : viewportEl.scrollWidth;
    const viewportSize = vertical ? viewportEl.clientHeight : viewportEl.clientWidth;
    const startScroll = vertical ? startScrollTop : startScrollLeft;
    const nextScroll = startScroll + scrollRatio * (scrollableSize - viewportSize);

    if (vertical) {
      viewportEl.scrollTop = nextScroll;
    } else {
      viewportEl.scrollLeft = nextScroll;
    }
    event.preventDefault();

    startScrolling(vertical);
  }

  function handleTouchModalityChange(event: PointerEvent) {
    setTouchModality(event.pointerType === 'touch');
  }

  function handlePointerEnterOrMove(event: PointerEvent) {
    handleTouchModalityChange(event);

    if (event.pointerType !== 'touch') {
      const isTargetRootChild = contains(rootRef, event.target as Element);
      setHovering(isTargetRootChild);
    }
  }

  const state = createMemo<ScrollAreaRootState>(() => {
    const currentHiddenState = hiddenState();
    const currentOverflowEdges = overflowEdges();
    return {
      scrolling: scrollingX() || scrollingY(),
      hasOverflowX: !currentHiddenState.x,
      hasOverflowY: !currentHiddenState.y,
      overflowXStart: currentOverflowEdges.xStart,
      overflowXEnd: currentOverflowEdges.xEnd,
      overflowYStart: currentOverflowEdges.yStart,
      overflowYEnd: currentOverflowEdges.yEnd,
      cornerHidden: currentHiddenState.corner,
    };
  });

  const props = (): HTMLProps => ({
    role: 'presentation',
    onPointerEnter: handlePointerEnterOrMove,
    onPointerMove: handlePointerEnterOrMove,
    onPointerDown: handleTouchModalityChange,
    onPointerLeave() {
      setHovering(false);
    },
    style: {
      position: 'relative',
      [ScrollAreaRootCssVars.scrollAreaCornerHeight as string]: `${cornerSize().height}px`,
      [ScrollAreaRootCssVars.scrollAreaCornerWidth as string]: `${cornerSize().width}px`,
    },
  });

  const contextValue: ScrollAreaRootContext = {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleScroll,
    disableViewportSnap,
    cornerSize,
    setCornerSize,
    thumbSize,
    setThumbSize,
    hasMeasuredScrollbar,
    setHasMeasuredScrollbar,
    touchModality,
    cornerRef,
    scrollingX,
    scrollingY,
    hovering,
    setHovering,
    viewportRef,
    scrollbarYRef,
    scrollbarXRef,
    thumbYRef,
    thumbXRef,
    rootId,
    hiddenState,
    setHiddenState,
    overflowEdges,
    setOverflowEdges,
    viewportState: state,
    overflowEdgeThreshold,
  };

  return (
    <ScrollAreaRootContext value={contextValue}>
      <Show when={!csp.disableStyleElements}>{styleDisableScrollbar.getElement(csp.nonce)}</Show>
      {useRenderElement('div', componentProps, {
        state,
        ref: (element: HTMLDivElement | null) => {
          rootRef = element;
        },
        props: () => [props(), elementProps],
        stateAttributesMapping: scrollAreaStateAttributesMapping,
      })}
    </ScrollAreaRootContext>
  );
}

export interface ScrollAreaRootState {
  /**
   * Whether the scroll area is being scrolled.
   */
  scrolling: boolean;
  /**
   * Whether horizontal overflow is present.
   */
  hasOverflowX: boolean;
  /**
   * Whether vertical overflow is present.
   */
  hasOverflowY: boolean;
  /**
   * Whether there is overflow on the inline start side for the horizontal axis.
   */
  overflowXStart: boolean;
  /**
   * Whether there is overflow on the inline end side for the horizontal axis.
   */
  overflowXEnd: boolean;
  /**
   * Whether there is overflow on the block start side.
   */
  overflowYStart: boolean;
  /**
   * Whether there is overflow on the block end side.
   */
  overflowYEnd: boolean;
  /**
   * Whether the scrollbar corner is hidden.
   */
  cornerHidden: boolean;
}

export interface ScrollAreaRootProps extends BaseUIComponentProps<'div', ScrollAreaRootState> {
  /**
   * The threshold in pixels that must be passed before the overflow edge attributes are applied.
   * Accepts a single number for all edges or an object to configure them individually.
   * @default 0
   */
  overflowEdgeThreshold?:
    | number
    | Partial<{
        xStart: number;
        xEnd: number;
        yStart: number;
        yEnd: number;
      }>
    | undefined;
}

export namespace ScrollAreaRoot {
  export type State = ScrollAreaRootState;
  export type Props = ScrollAreaRootProps;
}

function normalizeOverflowEdgeThreshold(
  threshold: ScrollAreaRoot.Props['overflowEdgeThreshold'] | undefined,
) {
  const thresholds =
    typeof threshold === 'number'
      ? { xStart: threshold, xEnd: threshold, yStart: threshold, yEnd: threshold }
      : threshold;

  return {
    xStart: Math.max(0, thresholds?.xStart || 0),
    xEnd: Math.max(0, thresholds?.xEnd || 0),
    yStart: Math.max(0, thresholds?.yStart || 0),
    yEnd: Math.max(0, thresholds?.yEnd || 0),
  };
}
