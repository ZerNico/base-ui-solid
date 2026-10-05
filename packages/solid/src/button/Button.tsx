import { createMemo, omit } from 'solid-js';
import { useButton } from '../internals/use-button/useButton';
import { useRenderElement } from '../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../internals/types';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Button](https://base-ui-solid.pages.dev/solid/components/button)
 */
export function Button(componentProps: Button.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'disabled',
    'focusableWhenDisabled',
    'nativeButton',
    'style',
  );

  const disabled = () => componentProps.disabled ?? false;

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: () => componentProps.focusableWhenDisabled ?? false,
    native: () => componentProps.nativeButton ?? true,
  });

  const state = createMemo<ButtonState>(() => ({
    disabled: disabled(),
  }));

  return useRenderElement('button', componentProps, {
    state,
    ref: buttonRef,
    props: () => [elementProps, getButtonProps],
  });
}

export interface ButtonState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

export interface ButtonProps
  extends NativeButtonProps, Omit<BaseUIComponentProps<'button', ButtonState>, 'disabled'> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  // Port note: declared here so it's a `boolean` (Solid's `disabled` attribute type also allows
  // `""`); upstream inherits it from React's button props.
  disabled?: boolean | undefined;
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
}

export namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}
