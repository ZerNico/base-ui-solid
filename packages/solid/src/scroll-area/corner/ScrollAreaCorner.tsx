import { Show, omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A small rectangular area that appears at the intersection of horizontal and vertical scrollbars.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui-solid.pages.dev/solid/components/scroll-area)
 */
export function ScrollAreaCorner(componentProps: ScrollAreaCorner.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { cornerRef, cornerSize, hiddenState } = useScrollAreaRootContext();

  return (
    <Show when={!hiddenState().corner}>
      {useRenderElement('div', componentProps, {
        ref: (element: HTMLDivElement | null) => {
          cornerRef.current = element;
        },
        props: () => [
          {
            'aria-hidden': true,
            style: {
              position: 'absolute',
              bottom: '0',
              'inset-inline-end': '0',
              // Port note: Solid doesn't append `px` to numeric style values like React does.
              width: `${cornerSize().width}px`,
              height: `${cornerSize().height}px`,
            },
          },
          elementProps,
        ],
      })}
    </Show>
  );
}

export interface ScrollAreaCornerState {}

export interface ScrollAreaCornerProps extends BaseUIComponentProps<'div', ScrollAreaCornerState> {}

export namespace ScrollAreaCorner {
  export type State = ScrollAreaCornerState;
  export type Props = ScrollAreaCornerProps;
}
