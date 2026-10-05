import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

/**
 * A button that closes the dialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui-solid.pages.dev/solid/components/dialog)
 */
export function DialogClose(componentProps: DialogClose.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'disabled', 'nativeButton');
  const disabled = () => componentProps.disabled ?? false;

  const store = useDialogRootContext();
  const open = store.useState('open');

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: () => componentProps.nativeButton ?? true,
  });

  const state = createMemo<DialogCloseState>(() => ({ disabled: disabled() }), {
    equals: fastObjectShallowCompare,
  });

  function handleClick(event: MouseEvent) {
    if (open()) {
      store.setOpen(false, createChangeEventDetails(REASONS.closePress, event));
    }
  }

  return useRenderElement('button', componentProps, {
    state,
    ref: buttonRef,
    props: () => [{ onClick: handleClick }, elementProps, getButtonProps],
  });
}

export interface DialogCloseProps
  extends NativeButtonProps, Omit<BaseUIComponentProps<'button', DialogCloseState>, 'disabled'> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  // Port note: declared here so it's a `boolean` (Solid's `disabled` attribute type also allows
  // `""`); upstream inherits it from React's button props.
  disabled?: boolean | undefined;
}

export interface DialogCloseState {
  /**
   * Whether the button is currently disabled.
   */
  disabled: boolean;
}

export namespace DialogClose {
  export type Props = DialogCloseProps;
  export type State = DialogCloseState;
}
