import { Show, createMemo, omit } from 'solid-js';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { contains, getTarget } from '../../floating-ui-react/utils';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { ScrollAreaScrollbarContext } from './ScrollAreaScrollbarContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { getOffset } from '../utils/getOffset';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import type { ScrollAreaRootState } from '../root/ScrollAreaRoot';
import * as ScrollAreaRootCssVars from '../root/ScrollAreaRootCssVars';
import * as ScrollAreaScrollbarCssVars from './ScrollAreaScrollbarCssVars';

/**
 * A vertical or horizontal scrollbar for the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaScrollbar(componentProps: ScrollAreaScrollbar.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'orientation',
    'keepMounted',
    'style',
  );

  const orientation = () => componentProps.orientation ?? 'vertical';
  const keepMounted = () => componentProps.keepMounted ?? false;

  const {
    hovering,
    scrollingX,
    scrollingY,
    hiddenState,
    scrollbarYRef,
    scrollbarXRef,
    viewportRef,
    thumbYRef,
    thumbXRef,
    handlePointerDown,
    handlePointerUp,
    handleScroll,
    disableViewportSnap,
    rootId,
    thumbSize,
    hasMeasuredScrollbar,
    viewportState,
  } = useScrollAreaRootContext();

  const vertical = () => orientation() === 'vertical';

  const state = createMemo<ScrollAreaScrollbarState>(() => ({
    ...viewportState(),
    hovering: hovering(),
    scrolling: vertical() ? scrollingY() : scrollingX(),
    orientation: orientation(),
  }));

  const direction = useDirection();
  const hideTrackUntilMeasured = () => !hasMeasuredScrollbar() && !keepMounted();
  const isHidden = () => (vertical() ? hiddenState().y : hiddenState().x);
  const shouldRender = createMemo(() => keepMounted() || !isHidden());

  useEffect(
    ([currentShouldRender, isVertical, currentDirection]) => {
      if (!currentShouldRender) {
        return undefined;
      }

      const viewportEl = viewportRef.current;
      const scrollbarEl = isVertical ? scrollbarYRef.current : scrollbarXRef.current;

      if (!scrollbarEl) {
        return undefined;
      }

      function handleWheel(event: WheelEvent) {
        if (!viewportEl || event.ctrlKey) {
          return;
        }

        const horizontal = !isVertical;
        const scrollProperty = horizontal ? 'scrollLeft' : 'scrollTop';
        const delta = horizontal ? event.deltaX : event.deltaY;
        if (delta === 0) {
          return;
        }

        const maxScroll = horizontal
          ? viewportEl.scrollWidth - viewportEl.clientWidth
          : viewportEl.scrollHeight - viewportEl.clientHeight;
        // RTL horizontal scrolling uses a negative `scrollLeft` range, from 0 to `-maxScroll`.
        const minScroll = horizontal && currentDirection === 'rtl' ? -maxScroll : 0;
        const maxScrollValue = horizontal && currentDirection === 'rtl' ? 0 : maxScroll;
        const scrollValue = viewportEl[scrollProperty];

        // At an edge (or with no overflow), let the wheel event chain to the
        // parent/page instead of swallowing it via `preventDefault`.
        if (
          (scrollValue <= minScroll && delta < 0) ||
          (scrollValue >= maxScrollValue && delta > 0)
        ) {
          return;
        }

        event.preventDefault();

        viewportEl[scrollProperty] = Math.min(
          maxScrollValue,
          Math.max(minScroll, scrollValue + delta),
        );

        handleScroll({ x: viewportEl.scrollLeft, y: viewportEl.scrollTop });
      }

      return addEventListener(scrollbarEl, 'wheel', handleWheel, { passive: false });
    },
    () => [shouldRender(), vertical(), direction()],
  );

  function handleTrackPointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }

    const isVertical = vertical();

    const target = getTarget(event) as Element | null;
    const thumbEl = isVertical ? thumbYRef.current : thumbXRef.current;

    // Ignore clicks on thumb, including cases where React retargets the
    // synthetic event to the track host across a shadow boundary.
    if (thumbEl && contains(thumbEl, target)) {
      return;
    }

    const viewportEl = viewportRef.current;
    if (!viewportEl) {
      return;
    }

    const scrollbarEl = isVertical ? scrollbarYRef.current : scrollbarXRef.current;

    if (!thumbEl || !scrollbarEl) {
      return;
    }

    const axis = isVertical ? 'y' : 'x';
    const thumbOffset = getOffset(thumbEl, 'margin', axis);
    const scrollbarOffset = getOffset(scrollbarEl, 'padding', axis);
    const thumbSizePx = isVertical ? thumbEl.offsetHeight : thumbEl.offsetWidth;
    const trackRect = scrollbarEl.getBoundingClientRect();
    const clickPosition = isVertical
      ? event.clientY - trackRect.top - thumbSizePx / 2 - scrollbarOffset + thumbOffset / 2
      : event.clientX - trackRect.left - thumbSizePx / 2 - scrollbarOffset + thumbOffset / 2;

    const scrollableSize = isVertical ? viewportEl.scrollHeight : viewportEl.scrollWidth;
    const viewportSize = isVertical ? viewportEl.clientHeight : viewportEl.clientWidth;
    const trackSize = isVertical ? scrollbarEl.offsetHeight : scrollbarEl.offsetWidth;

    const maxThumbOffset = trackSize - thumbSizePx - scrollbarOffset - thumbOffset;
    // A short or heavily padded track can drive `maxThumbOffset` to zero or
    // negative once the thumb hits its `MIN_THUMB_SIZE` floor. Dividing by it
    // would yield a non-finite (`Infinity`/`NaN`) or inverted scroll position.
    if (maxThumbOffset <= 0) {
      return;
    }

    const scrollRatio = clickPosition / maxThumbOffset;
    const maxScrollDistance = scrollableSize - viewportSize;

    // Disable snapping before the jump-to-click assignment, or the
    // assigned position quantizes to the nearest snap point and the thumb
    // stays offset from the pointer for the whole drag. `handlePointerDown`
    // below re-runs this as a guarded no-op for the thumb-drag path.
    disableViewportSnap();

    if (isVertical) {
      viewportEl.scrollTop = scrollRatio * maxScrollDistance;
    } else if (direction() === 'rtl') {
      viewportEl.scrollLeft = -(1 - scrollRatio) * maxScrollDistance;
    } else {
      viewportEl.scrollLeft = scrollRatio * maxScrollDistance;
    }

    handleScroll({ x: viewportEl.scrollLeft, y: viewportEl.scrollTop });

    handlePointerDown(event);
  }

  // Native scrollbars don't move focus when pressed, whichever button is used.
  // Handled here rather than on the thumb so the bubbled press covers both.
  function handleTrackMouseDown(event: MouseEvent) {
    event.preventDefault();
  }

  // Port note: the handlers are hoisted out of the reactive props so they keep their identity.
  const props = () => {
    const isVertical = vertical();
    return {
      ...(rootId && { 'data-id': `${rootId}-scrollbar` }),
      'aria-hidden': true,
      onPointerDown: handleTrackPointerDown,
      onMouseDown: handleTrackMouseDown,
      onPointerUp: handlePointerUp,
      // Mirror `onPointerUp` so a browser-cancelled gesture on the track (no thumb
      // child captures the pointer) still clears the drag state.
      onPointerCancel: handlePointerUp,
      style: {
        position: 'absolute',
        'touch-action': 'none',
        '-webkit-user-select': 'none',
        'user-select': 'none',
        visibility: hideTrackUntilMeasured() ? 'hidden' : undefined,
        ...(isVertical
          ? {
              top: '0',
              bottom: `var(${ScrollAreaRootCssVars.scrollAreaCornerHeight})`,
              'inset-inline-end': '0',
              [ScrollAreaScrollbarCssVars.scrollAreaThumbHeight as string]: `${thumbSize().height}px`,
            }
          : {
              'inset-inline-start': '0',
              'inset-inline-end': `var(${ScrollAreaRootCssVars.scrollAreaCornerWidth})`,
              bottom: '0',
              [ScrollAreaScrollbarCssVars.scrollAreaThumbWidth as string]: `${thumbSize().width}px`,
            }),
      },
    };
  };

  return (
    <Show when={shouldRender()}>
      <ScrollAreaScrollbarContext value={orientation}>
        {useRenderElement('div', componentProps, {
          ref: (element: HTMLDivElement | null) => {
            if (vertical()) {
              scrollbarYRef.current = element;
            } else {
              scrollbarXRef.current = element;
            }
          },
          state,
          props: () => [props(), elementProps],
          stateAttributesMapping: scrollAreaStateAttributesMapping,
        })}
      </ScrollAreaScrollbarContext>
    </Show>
  );
}

export interface ScrollAreaScrollbarState extends ScrollAreaRootState {
  /**
   * Whether the scroll area is being hovered.
   */
  hovering: boolean;
  /**
   * Whether the scroll area is being scrolled.
   */
  scrolling: boolean;
  /**
   * The orientation of the scrollbar.
   */
  orientation: 'vertical' | 'horizontal';
}

export interface ScrollAreaScrollbarProps extends BaseUIComponentProps<
  'div',
  ScrollAreaScrollbarState
> {
  /**
   * Whether the scrollbar controls vertical or horizontal scroll.
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal' | undefined;
  /**
   * Whether to keep the HTML element in the DOM when the viewport isn't scrollable.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace ScrollAreaScrollbar {
  export type State = ScrollAreaScrollbarState;
  export type Props = ScrollAreaScrollbarProps;
}
