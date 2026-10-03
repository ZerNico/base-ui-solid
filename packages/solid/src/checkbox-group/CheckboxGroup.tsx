import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { EMPTY_ARRAY } from '@base-ui-solid/utils/empty';
import { areArraysEqual } from '@base-ui-solid/utils/areArraysEqual';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useBaseUiId } from '../internals/useBaseUiId';
import { useRenderElement } from '../internals/useRenderElement';
import { CheckboxGroupContext } from './CheckboxGroupContext';
import type { FieldRootState } from '../field/root/FieldRoot';
import { isEligibleInput } from '../field/root/useFieldValidation';
import { useFieldRootContext } from '../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../internals/field-register-control/useRegisterFieldControl';
import { useLabelableContext } from '../internals/labelable-provider/LabelableContext';
import { useLabelableId } from '../internals/labelable-provider/useLabelableId';
import type { BaseUIComponentProps } from '../internals/types';
import { fieldValidityMapping } from '../internals/field-constants/constants';
import { useCheckboxGroupParent } from './useCheckboxGroupParent';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { REASONS } from '../internals/reasons';
import { useFormContext } from '../internals/form-context/FormContext';
import { useValueChanged } from '../internals/useValueChanged';

/**
 * Provides a shared state to a series of checkboxes.
 *
 * Documentation: [Base UI Checkbox Group](https://base-ui.com/react/components/checkbox-group)
 */
export function CheckboxGroup(componentProps: CheckboxGroup.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'allValues',
    'class',
    'defaultValue',
    'disabled',
    'id',
    'onValueChange',
    'render',
    'value',
    'style',
  );

  const {
    disabled: fieldDisabled,
    name: fieldName,
    state: fieldState,
    validation,
    setFilled,
    setDirty,
    validityData,
  } = useFieldRootContext();
  const { labelId, registerControlId, getDescriptionProps } = useLabelableContext();
  const { clearErrors, elementRef } = useFormContext();

  const disabled = () => (fieldDisabled() ?? false) || (componentProps.disabled ?? false);

  const [value, setValueUnwrapped] = useControlled<string[]>({
    controlled: () => componentProps.value,
    default: untrack(() => componentProps.defaultValue) ?? EMPTY_ARRAY,
    name: 'CheckboxGroup',
    state: 'value',
  });

  const setValue = (v: string[], eventDetails: CheckboxGroup.ChangeEventDetails) => {
    componentProps.onValueChange?.(v, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(v);
  };

  const allValues = () => componentProps.allValues;

  const parent = useCheckboxGroupParent({
    allValues,
    value,
    onValueChange: setValue,
  });

  // The group is the field's control and takes its name from `aria-labelledby`, so `Field.Label`
  // must not point `htmlFor` at one arbitrary checkbox inside the group.
  useLabelableId({ id: () => null });

  const generatedId = useBaseUiId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;
  const getInputControl = validation.getInputControl;

  const controlRef: RefObject<HTMLElement | null> = {
    get current() {
      return getInputControl();
    },
    set current(_value) {
      // The control is derived from the registered inputs.
    },
  };

  const getFormValue = () =>
    untrack(() => {
      const currentValue = value();
      const formElement = elementRef.current;
      if (!formElement) {
        return currentValue;
      }

      const successfulValues = new Set<string>();
      for (const [input, registration] of validation.registeredInputs) {
        if (
          registration.value !== undefined &&
          input.checked &&
          isEligibleInput(input, formElement)
        ) {
          successfulValues.add(registration.value);
        }
      }

      return currentValue.filter((inputValue) => successfulValues.has(inputValue));
    });

  useRegisterFieldControl(
    controlRef,
    id,
    value,
    getFormValue,
    () => !!fieldName() && !disabled(),
    fieldName,
  );

  useIsoLayoutEffect(
    ([currentValue]) => {
      setFilled(currentValue.length > 0);
    },
    () => [value()],
  );

  useValueChanged(value, () => {
    const currentFieldName = untrack(fieldName);
    if (currentFieldName) {
      clearErrors(currentFieldName);
    }

    const currentValue = untrack(value);
    const initialValue = untrack(validityData).initialValue;
    const initialArray = Array.isArray(initialValue)
      ? (initialValue as readonly string[])
      : EMPTY_ARRAY;

    setDirty(!areArraysEqual(currentValue, initialArray));

    validation.change(currentValue);
  });

  const state = createMemo<CheckboxGroupState>(() => ({
    ...fieldState(),
    disabled: disabled(),
  }));

  const contextValue: CheckboxGroupContext = {
    allValues,
    value,
    setValue,
    parent,
    disabled,
    validation,
    registerControlId,
  };

  return (
    <CheckboxGroupContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        state,
        props: () => [
          {
            id: componentProps.id,
            role: 'group',
            'aria-labelledby': labelId(),
          },
          elementProps,
          getDescriptionProps,
        ],
        stateAttributesMapping: fieldValidityMapping,
      })}
    </CheckboxGroupContext>
  );
}

export interface CheckboxGroupState extends FieldRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface CheckboxGroupProps extends BaseUIComponentProps<'div', CheckboxGroupState> {
  /**
   * Names of the checkboxes in the group that should be ticked.
   *
   * To render an uncontrolled checkbox group, use the `defaultValue` prop instead.
   */
  value?: string[] | undefined;
  /**
   * Names of the checkboxes in the group that should be initially ticked.
   *
   * To render a controlled checkbox group, use the `value` prop instead.
   */
  defaultValue?: string[] | undefined;
  /**
   * Event handler called when a checkbox in the group is ticked or unticked.
   * Provides the new value as an argument.
   */
  onValueChange?:
    ((value: string[], eventDetails: CheckboxGroupChangeEventDetails) => void) | undefined;
  /**
   * Names of all checkboxes in the group. Use this when creating a parent checkbox.
   */
  allValues?: string[] | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export type CheckboxGroupChangeEventReason = typeof REASONS.none;
export type CheckboxGroupChangeEventDetails =
  BaseUIChangeEventDetails<CheckboxGroup.ChangeEventReason>;

export namespace CheckboxGroup {
  export type State = CheckboxGroupState;
  export type Props = CheckboxGroupProps;
  export type ChangeEventReason = CheckboxGroupChangeEventReason;
  export type ChangeEventDetails = CheckboxGroupChangeEventDetails;
}
