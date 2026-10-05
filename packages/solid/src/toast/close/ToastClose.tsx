import { createMemo, createSignal, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useToastRootContext } from '../root/ToastRootContext';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { useButton } from '../../internals/use-button/useButton';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Closes the toast when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui-solid.pages.dev/solid/components/toast)
 */
export function ToastClose(componentProps: ToastClose.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'disabled', 'nativeButton');

  const store = useToastProviderContext();
  const { toast, expanded } = useToastRootContext();

  const [hasFocus, setHasFocus] = createSignal(false);

  const { getButtonProps, buttonRef } = useButton({
    disabled: () => componentProps.disabled as boolean | undefined,
    native: () => componentProps.nativeButton ?? true,
  });

  const state = createMemo<ToastCloseState>(
    () => ({
      type: toast().type,
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('button', componentProps, {
    ref: buttonRef,
    state,
    props: () => [
      {
        'aria-hidden': !expanded() && !hasFocus(),
        onClick() {
          store.closeToast(toast().id);
        },
        onFocusIn() {
          setHasFocus(true);
        },
        onFocusOut() {
          setHasFocus(false);
        },
      },
      elementProps,
      getButtonProps,
    ],
  });
}

export interface ToastCloseState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastCloseProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToastCloseState> {}

export namespace ToastClose {
  export type State = ToastCloseState;
  export type Props = ToastCloseProps;
}
