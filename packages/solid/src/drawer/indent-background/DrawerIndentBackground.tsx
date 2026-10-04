import { createMemo, omit } from 'solid-js';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useDrawerProviderContext } from '../provider/DrawerProviderContext';

const stateAttributesMapping: StateAttributesMapping<DrawerIndentBackgroundState> = {
  active(value): Record<string, string> | null {
    if (value) {
      return { 'data-active': '' };
    }
    return { 'data-inactive': '' };
  },
};
/**
 * An element placed before `<Drawer.Indent>` to render a background layer that can be styled based on whether any drawer is open.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export const DrawerIndentBackground = function DrawerIndentBackground(
  componentProps: DrawerIndentBackground.Props,
) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');
  const providerContext = useDrawerProviderContext();
  const active = createMemo(() => providerContext?.active() ?? false);
  const state = createMemo<DrawerIndentBackgroundState>(() => ({
    active: active(),
  }));
  return useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping,
  });
};
export interface DrawerIndentBackgroundState {
  /**
   * Whether any drawer within the nearest <Drawer> is open.
   */
  active: boolean;
}
export interface DrawerIndentBackgroundProps extends BaseUIComponentProps<
  'div',
  DrawerIndentBackgroundState
> {}
export namespace DrawerIndentBackground {
  export type State = DrawerIndentBackgroundState;
  export type Props = DrawerIndentBackgroundProps;
}
