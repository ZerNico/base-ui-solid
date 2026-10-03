import { createMemo, omit } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';
import { useFieldItemContext } from '../item/FieldItemContext';

/**
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldDescription(componentProps: FieldDescription.Props) {
  const elementProps = omit(componentProps, 'render', 'id', 'class', 'style');

  const generatedId = useBaseUiId();
  const id = () => componentProps.id ?? generatedId;

  const fieldRootContext = useFieldRootContext(false);
  const fieldItemContext = useFieldItemContext();
  const { setMessageIds } = useLabelableContext();

  const state = createMemo<FieldDescriptionState>(() => ({
    ...fieldRootContext.state(),
    disabled: (fieldRootContext.disabled() ?? false) || fieldItemContext.disabled(),
  }));

  useIsoLayoutEffect(
    ([currentId]) => {
      if (!currentId) {
        return undefined;
      }

      setMessageIds((v) => v.concat(currentId));

      return () => {
        setMessageIds((v) => v.filter((item) => item !== currentId));
      };
    },
    () => [id()],
  );

  return useRenderElement('p', componentProps, {
    state,
    props: () => [{ id: id() }, elementProps],
    stateAttributesMapping: fieldValidityMapping,
  });
}

export interface FieldDescriptionState extends FieldRootState {}

export interface FieldDescriptionProps extends BaseUIComponentProps<'p', FieldDescriptionState> {}

export namespace FieldDescription {
  export type State = FieldDescriptionState;
  export type Props = FieldDescriptionProps;
}
