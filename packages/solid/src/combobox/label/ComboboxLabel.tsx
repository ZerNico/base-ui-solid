import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { error } from '@base-ui-solid/utils/error';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import { useLabel } from '../../internals/labelable-provider/useLabel';
import { getDefaultLabelId } from '../../utils/resolveAriaLabelledBy';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/**
 * An accessible label that is automatically associated with the combobox trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxLabel(componentProps: ComboboxLabel.Props): JSX.Element {
  // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
  const elementProps = omit(
    componentProps as ComboboxLabel.Props & { id?: string | undefined },
    'render',
    'class',
    'style',
    'id',
  );

  const fieldRootContext = useFieldRootContext();
  const store = useComboboxRootContext();

  const inputInsidePopup = store.useState('inputInsidePopup');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const rootId = store.useState('id');
  const defaultLabelId = () => getDefaultLabelId(rootId());

  const localControlId = () => triggerElement()?.id ?? (inputInsidePopup() ? rootId() : undefined);

  if (IS_DEV) {
    // Port note: React's `captureOwnerStack` has no Solid counterpart, so no owner stack is
    // appended.
    useEffect(
      ([inputElementValue, inputInsidePopupValue]) => {
        if (!inputElementValue || inputInsidePopupValue) {
          return;
        }

        const message =
          '<Combobox.Label> labels <Combobox.Trigger> only. ' +
          'When <Combobox.Input> is the form control, use a native <label> or <Field.Label> instead.';
        error(message);
      },
      () => [inputElement(), inputInsidePopup()] as const,
    );
  }

  const labelProps = useLabel({
    id: defaultLabelId,
    fallbackControlId: localControlId,
    setLabelId(nextLabelId) {
      const resolvedLabelId =
        typeof nextLabelId === 'function' ? nextLabelId(store.state.labelId) : nextLabelId;
      store.set('labelId', resolvedLabelId);
    },
  });

  return useRenderElement('div', componentProps, {
    state: fieldRootContext.state,
    props: () => [labelProps(), elementProps],
    stateAttributesMapping: fieldValidityMapping,
  });
}

export interface ComboboxLabelState extends FieldRoot.State {}

export interface ComboboxLabelProps extends Omit<
  BaseUIComponentProps<'div', ComboboxLabelState>,
  'id'
> {}

export namespace ComboboxLabel {
  export type State = ComboboxLabelState;
  export type Props = ComboboxLabelProps;
}
