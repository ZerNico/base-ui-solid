import { createMemo, flush, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useValueChanged } from '../../internals/useValueChanged';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';

/**
 * The form control to label and validate.
 * Renders an `<input>` element.
 *
 * You can omit this part and use any Base UI input component instead. For example,
 * [Input](https://base-ui.com/react/components/input), [Checkbox](https://base-ui.com/react/components/checkbox),
 * or [Select](https://base-ui.com/react/components/select), among others, will work with Field out of the box.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldControl(componentProps: FieldControl.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'id',
    'name',
    'value',
    'disabled',
    'onValueChange',
    'defaultValue',
    'autofocus',
    'style',
  );

  const {
    state: fieldState,
    name: fieldName,
    disabled: fieldDisabled,
    setTouched,
    setDirty,
    validityData,
    setFilled,
    validationMode,
    validation,
  } = useFieldRootContext();
  const { clearErrors, elementRef: formElementRef, submitCountRef } = useFormContext();

  const disabled = () =>
    (fieldDisabled() ?? false) ||
    (componentProps.disabled !== undefined && componentProps.disabled !== false);
  // `false` removes the attribute in Solid, so it counts as not provided.
  const nameProp = () => componentProps.name || undefined;
  const name = () => fieldName() ?? nameProp();

  const state = createMemo<FieldControlState>(() => ({
    ...fieldState(),
    disabled: disabled(),
  }));

  const { labelId } = useLabelableContext();

  const id = useLabelableId({ id: () => componentProps.id || undefined });

  const [valueUnwrapped] = useControlled({
    controlled: () => componentProps.value,
    default: untrack(() => componentProps.defaultValue),
    name: 'FieldControl',
    state: 'value',
  });

  const isControlled = () => componentProps.value !== undefined;
  const value = () => (isControlled() ? valueUnwrapped() : undefined);
  // The DOM value is always a string, so dirty comparisons must serialize the controlled value.
  const serializedValue = () => {
    const currentValue = value();
    return currentValue == null ? undefined : String(currentValue);
  };

  const getValueFromInput = () => validation.inputRef.current?.value;

  useRegisterFieldControl(
    validation.inputRef,
    id,
    serializedValue,
    getValueFromInput,
    () => !disabled(),
    nameProp,
  );

  useIsoLayoutEffect(
    ([currentSerializedValue]) => {
      const currentValue = currentSerializedValue ?? validation.inputRef.current?.value;
      if (currentValue !== undefined) {
        setFilled(currentValue !== '');
      }
    },
    () => [serializedValue()],
  );

  useValueChanged(serializedValue, () => {
    const currentSerializedValue = untrack(serializedValue);
    if (currentSerializedValue === undefined) {
      return;
    }

    clearErrors(untrack(name));
    setDirty(currentSerializedValue !== (untrack(validityData).initialValue ?? ''));

    validation.change(currentSerializedValue);
  });

  let inputElement: HTMLElement | null = null;
  const setFocused = useSetFieldFocused(disabled, () => inputElement);
  const enterValidationTimeout = useTimeout();

  return useRenderElement('input', componentProps, {
    ref: (element: HTMLInputElement | null) => {
      // Port note: React detaches the old ref before attaching a replacement control's ref.
      // Solid disposes the old control after the new one has mounted, so only clear our own.
      if (element) {
        validation.inputRef.current = element;
      } else if (validation.inputRef.current === inputElement) {
        validation.inputRef.current = null;
      }
      inputElement = element;
    },
    state,
    props: () => [
      {
        id: id(),
        disabled: disabled(),
        name: name(),
        'aria-labelledby': labelId(),
        autofocus: componentProps.autofocus ?? false,
        ...(isControlled()
          ? { value: value() }
          : { defaultValue: untrack(() => componentProps.defaultValue) }),
        // Port note: React's `onChange` fires on every keystroke, like the native `input` event.
        onInput(event: InputEvent) {
          const input = event.currentTarget as HTMLInputElement;
          const inputValue = input.value;
          const details = createChangeEventDetails(REASONS.none, event);
          componentProps.onValueChange?.(inputValue, details);

          // Controlled values sync from the `value` prop instead, so that a value the consumer
          // rejects or rewrites never reaches the field state.
          if (untrack(isControlled)) {
            // Port note: React restores a controlled input's value when the consumer doesn't
            // accept the change. Solid doesn't, so restore it once the update has been applied.
            flush();
            const controlledValue = untrack(serializedValue) ?? '';
            if (input.value !== controlledValue) {
              input.value = controlledValue;
            }
            return;
          }

          const initialValue = untrack(validityData).initialValue ?? '';
          // `validation.change` reads `markedDirtyRef`, so update dirty before validating.
          setDirty(inputValue !== initialValue);
          setFilled(inputValue !== '');

          if (!event.defaultPrevented && !details.isCanceled) {
            clearErrors(untrack(name));
            validation.change(inputValue);
          }
        },
        onFocus() {
          setFocused(true);
        },
        onBlur(event: FocusEvent) {
          setTouched(true);
          setFocused(false);

          if (untrack(validationMode) === 'onBlur') {
            const inputValue = (event.currentTarget as HTMLInputElement).value;
            validation.commit(inputValue);

            if (untrack(isControlled)) {
              // Controlled blur handlers can normalize the value before this microtask runs.
              // A rewrite back to the initial value is a programmatic reset: the field looks
              // pristine, so committing it would only surface `valueMissing` noise.
              queueMicrotask(() => {
                const nextValue = validation.inputRef.current?.value;
                if (
                  nextValue !== undefined &&
                  nextValue !== inputValue &&
                  nextValue !== (untrack(validityData).initialValue ?? '')
                ) {
                  validation.commit(nextValue);
                }
              });
            }
          }
        },
        onKeyDown(event: KeyboardEvent) {
          const input = event.currentTarget as HTMLInputElement;
          if (input.tagName === 'INPUT' && event.key === 'Enter') {
            setTouched(true);
            const currentValue = input.value;
            const form = input.form;
            if (form && form === formElementRef.current && !event.defaultPrevented) {
              const submitCount = submitCountRef.current;

              // Implicit submission runs after keydown. Fall back unless Form handles it first.
              enterValidationTimeout.start(0, () => {
                if (submitCountRef.current === submitCount) {
                  validation.commit(input.value);
                }
              });
            } else {
              validation.commit(currentValue);
            }
          }
        },
      },
      elementProps,
      (props: Record<string, any>) => validation.getValidationProps(disabled(), props),
    ],
    stateAttributesMapping: fieldValidityMapping,
  });
}

export interface FieldControlState extends FieldRootState {}

export interface FieldControlProps
  extends Omit<BaseUIComponentProps<'input', FieldControlState>, 'value'> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?:
    | ((value: string, eventDetails: FieldControl.ChangeEventDetails) => void)
    | undefined;
  defaultValue?: string | number | string[] | undefined;
  value?: string | number | string[] | undefined;
}

export type FieldControlChangeEventReason = typeof REASONS.none;

export type FieldControlChangeEventDetails =
  BaseUIChangeEventDetails<FieldControl.ChangeEventReason>;

export namespace FieldControl {
  export type State = FieldControlState;
  export type Props = FieldControlProps;
  export type ChangeEventReason = FieldControlChangeEventReason;
  export type ChangeEventDetails = FieldControlChangeEventDetails;
}
