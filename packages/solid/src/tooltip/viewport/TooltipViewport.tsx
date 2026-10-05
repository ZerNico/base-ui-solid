import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { popupViewportStateMapping, usePopupViewport } from '../../utils/usePopupViewport';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui-solid.pages.dev/solid/components/tooltip)
 */
export function TooltipViewport(componentProps: TooltipViewport.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children');

  const store = useTooltipRootContext();
  const positioner = useTooltipPositionerContext();

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

  const state = createMemo<TooltipViewportState>(() => ({
    activationDirection: viewportState().activationDirection,
    transitioning: viewportState().transitioning,
    instant: instantType(),
  }));

  return useRenderElement('div', componentProps, {
    state,
    props: [elementProps, { children: childrenToRender }],
    stateAttributesMapping: popupViewportStateMapping,
  });
}

export interface TooltipViewportState {
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
  instant: 'delay' | 'dismiss' | 'focus' | undefined;
}

export interface TooltipViewportProps extends BaseUIComponentProps<'div', TooltipViewportState> {
  /**
   * The content to render inside the transition container.
   */
  children?: JSX.Element | undefined;
}

export namespace TooltipViewport {
  export type Props = TooltipViewportProps;
  export type State = TooltipViewportState;
}
