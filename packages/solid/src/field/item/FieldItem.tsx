import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { FieldItemContext } from './FieldItemContext';
import { LabelableProvider } from '../../internals/labelable-provider';

/**
 * Groups individual items in a checkbox group or radio group with a label and description.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui-solid.pages.dev/solid/components/field)
 */
export function FieldItem(componentProps: FieldItem.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'disabled');

  const { state: fieldState, disabled: rootDisabled } = useFieldRootContext(false);

  const disabled = () => (rootDisabled() ?? false) || (componentProps.disabled ?? false);
  const state = createMemo<FieldItemState>(() => ({ ...fieldState(), disabled: disabled() }), {
    equals: fastObjectShallowCompare,
  });

  const fieldItemContext: FieldItemContext = { disabled };

  return (
    <LabelableProvider>
      <FieldItemContext value={fieldItemContext}>
        {useRenderElement('div', componentProps, {
          state,
          props: elementProps,
          stateAttributesMapping: fieldValidityMapping,
        })}
      </FieldItemContext>
    </LabelableProvider>
  );
}

export interface FieldItemState extends FieldRootState {}

export interface FieldItemProps extends BaseUIComponentProps<'div', FieldItemState> {
  /**
   * Whether the wrapped control should ignore user interaction.
   * The `disabled` prop on `<Field.Root>` takes precedence over this.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace FieldItem {
  export type State = FieldItemState;
  export type Props = FieldItemProps;
}
