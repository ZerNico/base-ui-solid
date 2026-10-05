import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import type { BaseUIComponentProps } from '../../internals/types';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Groups the input with the increment and decrement buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui-solid.pages.dev/solid/components/number-field)
 */
export function NumberFieldGroup(componentProps: NumberFieldGroup.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { state } = useNumberFieldRootContext();

  const element = useRenderElement('div', componentProps, {
    state,
    props: [{ role: 'group' }, elementProps],
    stateAttributesMapping,
  });

  return element;
}

export interface NumberFieldGroupState extends NumberFieldRootState {}

export interface NumberFieldGroupProps extends BaseUIComponentProps<'div', NumberFieldGroupState> {}

export namespace NumberFieldGroup {
  export type State = NumberFieldGroupState;
  export type Props = NumberFieldGroupProps;
}
