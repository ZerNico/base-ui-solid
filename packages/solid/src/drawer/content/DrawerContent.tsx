import { omit } from 'solid-js';
import { useDialogRootContext } from '../../dialog/root/DialogRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { DRAWER_CONTENT_ATTRIBUTE } from './drawerContentAttribute';
/**
 * A container for the drawer contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui-solid.pages.dev/solid/components/drawer)
 */
export const DrawerContent = function DrawerContent(componentProps: DrawerContent.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');
  useDialogRootContext();
  return useRenderElement('div', componentProps, {
    props: () => [{ [DRAWER_CONTENT_ATTRIBUTE as string]: '' }, elementProps],
  });
};
export interface DrawerContentProps extends BaseUIComponentProps<'div', DrawerContentState> {}
export interface DrawerContentState {}
export namespace DrawerContent {
  export type Props = DrawerContentProps;
  export type State = DrawerContentState;
}
