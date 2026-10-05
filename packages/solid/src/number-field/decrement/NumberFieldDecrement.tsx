import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useNumberFieldStepperButton } from '../root/useNumberFieldStepperButton';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';

/**
 * A stepper button that decreases the field value when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui-solid.pages.dev/solid/components/number-field)
 */
export function NumberFieldDecrement(componentProps: NumberFieldDecrement.Props): JSX.Element {
  return useNumberFieldStepperButton(componentProps, false);
}

export interface NumberFieldDecrementState extends NumberFieldRootState {}

export interface NumberFieldDecrementProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NumberFieldDecrementState> {}

export namespace NumberFieldDecrement {
  export type State = NumberFieldDecrementState;
  export type Props = NumberFieldDecrementProps;
}
