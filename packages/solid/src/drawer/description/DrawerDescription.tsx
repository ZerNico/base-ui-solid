import type { JSX } from '@solidjs/web';
import { DialogDescription } from '../../dialog/description/DialogDescription';
import type { BaseUIComponentProps } from '../../internals/types';
/**
 * A paragraph with additional information about the drawer.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui-solid.pages.dev/solid/components/drawer)
 */
export const DrawerDescription = DialogDescription as DrawerDescription;
export interface DrawerDescriptionProps extends BaseUIComponentProps<'p', DrawerDescriptionState> {}
export interface DrawerDescriptionState {}
export interface DrawerDescription {
  (componentProps: DrawerDescriptionProps): JSX.Element;
}
export namespace DrawerDescription {
  export type Props = DrawerDescriptionProps;
  export type State = DrawerDescriptionState;
}
