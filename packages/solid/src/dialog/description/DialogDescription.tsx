import { omit } from 'solid-js';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * A paragraph with additional information about the dialog.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui-solid.pages.dev/solid/components/dialog)
 */
export function DialogDescription(componentProps: DialogDescription.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const store = useDialogRootContext();

  const generatedId = useBaseUiId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;

  store.useSyncedValueWithCleanup('descriptionElementId', id);

  return useRenderElement('p', componentProps, {
    props: () => [{ id: id() }, elementProps],
  });
}

export interface DialogDescriptionProps extends BaseUIComponentProps<'p', DialogDescriptionState> {}

export interface DialogDescriptionState {}

export namespace DialogDescription {
  export type Props = DialogDescriptionProps;
  export type State = DialogDescriptionState;
}
