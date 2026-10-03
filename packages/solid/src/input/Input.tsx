import type { JSX } from '@solidjs/web';
import { Field } from '../field';
import type { FieldControlState } from '../field';

/**
 * A native input element that automatically works with [Field](https://base-ui.com/react/components/field).
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Input](https://base-ui.com/react/components/input)
 */
export function Input(props: Input.Props): JSX.Element {
  return <Field.Control {...props} />;
}

export interface InputProps extends Field.Control.Props {}

export interface InputState extends FieldControlState {}

export type InputChangeEventReason = Field.Control.ChangeEventReason;
export type InputChangeEventDetails = Field.Control.ChangeEventDetails;

export namespace Input {
  export type Props = InputProps;
  export type State = InputState;
  export type ChangeEventReason = InputChangeEventReason;
  export type ChangeEventDetails = InputChangeEventDetails;
}
