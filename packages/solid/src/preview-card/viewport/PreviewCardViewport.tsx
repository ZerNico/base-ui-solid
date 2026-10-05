import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import { usePreviewCardPositionerContext } from '../positioner/PreviewCardPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { popupViewportStateMapping, usePopupViewport } from '../../utils/usePopupViewport';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui-solid.pages.dev/solid/components/preview-card)
 */
export function PreviewCardViewport(componentProps: PreviewCardViewport.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children');

  const store = usePreviewCardRootContext();
  const positioner = usePreviewCardPositionerContext();

  const instantType = store.useState('instantType');

  const { children: childrenToRender, state: viewportState } = usePopupViewport({
    store,
    get side() {
      return positioner.side;
    },
    get children() {
      return componentProps.children;
    },
  });

  const state = createMemo<PreviewCardViewportState>(
    () => ({
      activationDirection: viewportState().activationDirection,
      transitioning: viewportState().transitioning,
      instant: instantType(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('div', componentProps, {
    state,
    props: [elementProps, { children: childrenToRender }],
    stateAttributesMapping: popupViewportStateMapping,
  });
}

export interface PreviewCardViewportState {
  /**
   * The activation direction of the transitioned content.
   */
  activationDirection: string | undefined;
  /**
   * Whether the viewport is currently transitioning between contents.
   */
  transitioning: boolean;
  /**
   * Present if animations should be instant.
   */
  instant: 'dismiss' | 'focus' | undefined;
}

export interface PreviewCardViewportProps extends BaseUIComponentProps<
  'div',
  PreviewCardViewportState
> {
  /**
   * The content to render inside the transition container.
   */
  children?: JSX.Element | undefined;
}

export namespace PreviewCardViewport {
  export type Props = PreviewCardViewportProps;
  export type State = PreviewCardViewportState;
}
