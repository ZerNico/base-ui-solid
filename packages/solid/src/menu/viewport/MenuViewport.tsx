import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { popupViewportStateMapping, usePopupViewport } from '../../utils/usePopupViewport';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuViewport(componentProps: MenuViewport.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children');

  const { store } = useMenuRootContext();
  const positioner = useMenuPositionerContext();

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

  const state = createMemo<MenuViewportState>(
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

export interface MenuViewportState {
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
  instant: 'dismiss' | 'click' | 'group' | 'trigger-change' | undefined;
}

export interface MenuViewportProps extends BaseUIComponentProps<'div', MenuViewportState> {
  /**
   * The content to render inside the transition container.
   */
  children?: JSX.Element | undefined;
}

export namespace MenuViewport {
  export type Props = MenuViewportProps;
  export type State = MenuViewportState;
}
