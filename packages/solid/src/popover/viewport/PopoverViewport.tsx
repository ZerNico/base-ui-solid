import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { popupViewportStateMapping, usePopupViewport } from '../../utils/usePopupViewport';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverViewport(componentProps: PopoverViewport.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children');

  const store = usePopoverRootContext();
  const positioner = usePopoverPositionerContext();

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

  const state = createMemo<PopoverViewportState>(
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

export interface PopoverViewportState {
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
  instant: 'dismiss' | 'click' | 'focus' | 'trigger-change' | undefined;
}

export interface PopoverViewportProps extends BaseUIComponentProps<'div', PopoverViewportState> {
  /**
   * The content to render inside the transition container.
   */
  children?: JSX.Element | undefined;
}

export namespace PopoverViewport {
  export type Props = PopoverViewportProps;
  export type State = PopoverViewportState;
}
