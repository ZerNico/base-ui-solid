import { createMemo, merge, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { getCombinedFieldValidityData } from '../utils/getCombinedFieldValidityData';
import type { FieldValidityData } from '../root/FieldRoot';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import type { TransitionStatus } from '../../internals/useTransitionStatus';

/**
 * Used to display a custom message based on the field's validity.
 * Requires `children` to be a function that accepts field validity state as an argument.
 *
 * The state is reactive: read it in JSX, don't destructure it.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldValidity(props: FieldValidity.Props): JSX.Element {
  const { validityData, invalid } = useFieldRootContext(false);

  const combinedFieldValidityData = createMemo(() =>
    getCombinedFieldValidityData(validityData(), invalid()),
  );
  const isInvalid = () => combinedFieldValidityData().state.valid === false;
  const { transitionStatus } = useTransitionStatus(isInvalid);

  const fieldValidityState = createMemo<FieldValidityState>(() => ({
    ...combinedFieldValidityData(),
    validity: combinedFieldValidityData().state,
    transitionStatus: transitionStatus(),
  }));

  const stateView = merge(fieldValidityState) as FieldValidityState;

  return <>{untrack(() => props.children(stateView))}</>;
}

export interface FieldValidityState extends Omit<FieldValidityData, 'state'> {
  validity: FieldValidityData['state'];
  transitionStatus: TransitionStatus;
}

export interface FieldValidityProps {
  /**
   * A function that accepts the field validity state as an argument.
   *
   * ```jsx
   * <Field.Validity>
   *   {(validity) => {
   *     return <div>...</div>
   *   }}
   * </Field.Validity>
   * ```
   */
  children: (state: FieldValidityState) => JSX.Element;
}

export namespace FieldValidity {
  export type State = FieldValidityState;
  export type Props = FieldValidityProps;
}
