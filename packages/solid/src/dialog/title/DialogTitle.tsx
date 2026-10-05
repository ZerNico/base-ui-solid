import { omit } from 'solid-js';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * A heading that labels the dialog.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui-solid.pages.dev/solid/components/dialog)
 */
export function DialogTitle(componentProps: DialogTitle.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const store = useDialogRootContext();

  const generatedId = useBaseUiId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;

  store.useSyncedValueWithCleanup('titleElementId', id);

  return useRenderElement('h2', componentProps, {
    props: () => [{ id: id() }, elementProps],
  });
}

export interface DialogTitleProps extends BaseUIComponentProps<'h2', DialogTitleState> {}

export interface DialogTitleState {}

export namespace DialogTitle {
  export type Props = DialogTitleProps;
  export type State = DialogTitleState;
}
