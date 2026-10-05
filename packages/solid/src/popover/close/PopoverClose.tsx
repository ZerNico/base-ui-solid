import { omit } from 'solid-js';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useClosePartRegistration } from '../../utils/closePart';

/**
 * A button that closes the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverClose(componentProps: PopoverClose.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'disabled', 'nativeButton');

  const { buttonRef, getButtonProps } = useButton({
    disabled: () => componentProps.disabled ?? false,
    focusableWhenDisabled: () => false,
    native: () => componentProps.nativeButton ?? true,
  });

  const store = usePopoverRootContext();
  useClosePartRegistration();

  const element = useRenderElement('button', componentProps, {
    ref: buttonRef,
    props: [
      {
        onClick(event: MouseEvent) {
          store.setOpen(false, createChangeEventDetails(REASONS.closePress, event));
        },
      },
      elementProps,
      getButtonProps,
    ],
  });

  return element;
}

export interface PopoverCloseState {}

export interface PopoverCloseProps
  extends NativeButtonProps, Omit<BaseUIComponentProps<'button', PopoverCloseState>, 'disabled'> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  // Port note: declared here so it's a `boolean` (Solid's `disabled` attribute type also allows
  // `""`); upstream inherits it from React's button props.
  disabled?: boolean | undefined;
}

export namespace PopoverClose {
  export type State = PopoverCloseState;
  export type Props = PopoverCloseProps;
}
