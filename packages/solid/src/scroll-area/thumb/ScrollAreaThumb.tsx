import { createMemo, omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaScrollbarContext } from '../scrollbar/ScrollAreaScrollbarContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * The draggable part of the scrollbar that indicates the current scroll position.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaThumb(componentProps: ScrollAreaThumb.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const {
    thumbYRef,
    thumbXRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    scrollingX,
    scrollingY,
    hasMeasuredScrollbar,
  } = useScrollAreaRootContext();

  const orientation = useScrollAreaScrollbarContext();
  const vertical = () => orientation() === 'vertical';

  const state = createMemo<ScrollAreaThumbState>(() => ({
    scrolling: vertical() ? scrollingY() : scrollingX(),
    orientation: orientation(),
  }));

  return useRenderElement('div', componentProps, {
    ref: (element: HTMLDivElement | null) => {
      if (vertical()) {
        thumbYRef.current = element;
      } else {
        thumbXRef.current = element;
      }
    },
    state,
    props: () => [
      {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        style: {
          visibility: hasMeasuredScrollbar() ? undefined : 'hidden',
          ...(vertical()
            ? { height: 'var(--scroll-area-thumb-height)' }
            : { width: 'var(--scroll-area-thumb-width)' }),
        },
      },
      elementProps,
    ],
  });
}

export interface ScrollAreaThumbState {
  /**
   * Whether the scroll area is being scrolled.
   */
  scrolling: boolean;
  /**
   * The component orientation.
   */
  orientation: 'horizontal' | 'vertical';
}

export interface ScrollAreaThumbProps extends BaseUIComponentProps<'div', ScrollAreaThumbState> {}

export namespace ScrollAreaThumb {
  export type State = ScrollAreaThumbState;
  export type Props = ScrollAreaThumbProps;
}
