import { createMemo, omit } from 'solid-js';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import { useRenderElement } from '../../internals/useRenderElement';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import {
  useFilterDropdownRootContext,
  useFilterDropdownValueContext,
} from '../root/FilterDropdownRootContext';
/**
 * @internal
 */
export function FilterDropdownClear(componentProps: FilterDropdownClear.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'disabled', 'nativeButton');
  const context = useFilterDropdownRootContext();
  const value = useFilterDropdownValueContext();
  const disabled = () => context.disabled || (componentProps.disabled ?? false);
  const visible = () => value() !== '';
  const { buttonRef, getButtonProps } = useButton({
    disabled,
    native: () => componentProps.nativeButton ?? true,
  });
  // `visible` is deliberately absent from the state: the component renders nothing when it is
  // false, so a `data-visible` attribute would be present on every rendered instance.
  const state = createMemo<FilterDropdownClearState>(() => ({ disabled: disabled() }));
  return useRenderElement('button', componentProps, {
    enabled: visible,
    state,
    ref: [buttonRef],
    props: () => [
      {
        tabindex: -1,
        'aria-hidden': true,
        onMouseDown(
          event: MouseEvent & {
            currentTarget: HTMLButtonElement;
          },
        ) {
          // Avoid stealing focus from the input on pointer interaction.
          event.preventDefault();
        },
        onClick(
          event: MouseEvent & {
            currentTarget: HTMLButtonElement;
          },
        ) {
          const eventDetails = createChangeEventDetails(REASONS.clearPress, event);
          context.onValueChange('', eventDetails);
          context.focusOwnerRef.current?.focus({ preventScroll: true });
        },
      },
      elementProps,
      getButtonProps,
    ],
  });
}
export interface FilterDropdownClearState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}
export interface FilterDropdownClearProps
  extends NativeButtonProps, BaseUIComponentProps<'button', FilterDropdownClearState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}
export namespace FilterDropdownClear {
  export type Props = FilterDropdownClearProps;
  export type State = FilterDropdownClearState;
}
