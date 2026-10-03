import { omit, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useScrollAreaViewportContext } from '../viewport/ScrollAreaViewportContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import type { ScrollAreaRootState } from '../root/ScrollAreaRoot';

/**
 * A container for the content of the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaContent(componentProps: ScrollAreaContent.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { computeThumbPosition } = useScrollAreaViewportContext();
  const { hasMeasuredScrollbar, viewportState } = useScrollAreaRootContext();

  let contentWrapperRef: HTMLDivElement | null = null;
  const computeOnInitialResize = untrack(hasMeasuredScrollbar);

  useIsoLayoutEffect(
    () => {
      if (typeof ResizeObserver === 'undefined') {
        return undefined;
      }

      let hasInitialized = false;
      const resizeObserver = new ResizeObserver(() => {
        if (!hasInitialized) {
          hasInitialized = true;

          // ResizeObserver fires once upon observing. Skip that initial call to avoid
          // double-calculating the thumb position on mount, unless the content mounted
          // after the viewport's initial measurement (in which case this fire is what
          // brings the overflow state in sync).
          if (!computeOnInitialResize) {
            return;
          }
        }

        computeThumbPosition();
      });

      if (contentWrapperRef) {
        resizeObserver.observe(contentWrapperRef);
      }

      return () => {
        resizeObserver.disconnect();
      };
    },
    () => [],
  );

  return useRenderElement('div', componentProps, {
    ref: (element: HTMLDivElement | null) => {
      contentWrapperRef = element;
    },
    state: viewportState,
    stateAttributesMapping: scrollAreaStateAttributesMapping,
    props: () => [
      {
        role: 'presentation',
        style: {
          'min-width': 'fit-content',
        },
      },
      elementProps,
    ],
  });
}

export interface ScrollAreaContentState extends ScrollAreaRootState {}

export interface ScrollAreaContentProps extends BaseUIComponentProps<
  'div',
  ScrollAreaContentState
> {}

export namespace ScrollAreaContent {
  export type State = ScrollAreaContentState;
  export type Props = ScrollAreaContentProps;
}
