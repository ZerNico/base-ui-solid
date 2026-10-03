import { createMemo, flush, omit, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui-solid/utils/visuallyHidden';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useButton } from '../../internals/use-button/useButton';
import { SwitchRootContext } from './SwitchRootContext';
import { stateAttributesMapping } from '../stateAttributesMapping';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '../../internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useValueChanged } from '../../internals/useValueChanged';

/**
 * Represents the switch itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export function SwitchRoot(componentProps: SwitchRoot.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'checked',
    'class',
    'defaultChecked',
    'aria-labelledby',
    'form',
    'id',
    'inputRef',
    'name',
    'nativeButton',
    'onCheckedChange',
    'readOnly',
    'required',
    'disabled',
    'render',
    'uncheckedValue',
    'value',
    'style',
  );

  const nativeButton = () => componentProps.nativeButton ?? false;
  const readOnly = () => componentProps.readOnly ?? false;
  const required = () => componentProps.required ?? false;

  const { clearErrors } = useFormContext();
  const {
    state: fieldState,
    setTouched,
    setDirty,
    validityData,
    setFilled,
    validationMode,
    disabled: fieldDisabled,
    name: fieldName,
    validation,
  } = useFieldRootContext();
  const { labelId } = useLabelableContext();

  const disabled = () => (fieldDisabled() ?? false) || (componentProps.disabled ?? false);
  const nameProp = () => componentProps.name;
  const name = () => fieldName() ?? nameProp();

  let inputElement: HTMLInputElement | null = null;
  const handleInputRef = (element: HTMLInputElement | null) => {
    inputElement = element;
    validation.inputRef.current = element;
  };

  const switchRef: RefObject<HTMLElement | null> = { current: null };
  const setFocused = useSetFieldFocused(disabled, () => switchRef.current);

  const id = useBaseUiId();

  const controlId = useLabelableId({ id: () => componentProps.id });
  const hiddenInputId = () => (nativeButton() ? undefined : controlId());

  const [checked, setCheckedState] = useControlled({
    controlled: () => componentProps.checked,
    default: Boolean(untrack(() => componentProps.defaultChecked)),
    name: 'Switch',
    state: 'checked',
  });

  useRegisterFieldControl(
    switchRef,
    () => id,
    checked,
    undefined,
    () => !disabled(),
    nameProp,
  );

  useIsoLayoutEffect(
    ([currentChecked]) => {
      setFilled(currentChecked);
    },
    () => [checked()],
  );

  useValueChanged(checked, () => {
    const currentChecked = untrack(checked);
    clearErrors(untrack(name));
    setDirty(currentChecked !== untrack(validityData).initialValue);

    validation.change(currentChecked);
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });
  const ariaLabelledBy = useAriaLabelledBy(
    () => componentProps['aria-labelledby'] || undefined,
    labelId,
    () => inputElement,
    () => !nativeButton(),
    hiddenInputId,
    () => componentProps['aria-label'] || undefined,
  );

  const rootProps = () => ({
    id: nativeButton() ? controlId() : id,
    role: 'switch',
    'aria-checked': checked(),
    'aria-readonly': readOnly() || undefined,
    'aria-required': required() || undefined,
    'aria-labelledby': ariaLabelledBy(),
    // Port note: the root is the focus target itself, so the non-bubbling native events suffice.
    onFocus() {
      setFocused(true);
    },
    onBlur() {
      const element = inputElement;
      if (!element || untrack(disabled)) {
        return;
      }

      setTouched(true);
      setFocused(false);

      if (untrack(validationMode) === 'onBlur') {
        validation.commit(element.checked);
      }
    },
    onClick(event: MouseEvent) {
      if (untrack(readOnly) || untrack(disabled)) {
        return;
      }

      event.preventDefault();

      const input = inputElement;
      if (!input) {
        return;
      }

      dispatchClickWithModifiers(input, event);
    },
  });

  const inputProps = () => [
    validation.getValidationProps(disabled()),
    {
      checked: checked(),
      disabled: disabled(),
      form: componentProps.form,
      id: hiddenInputId(),
      name: name(),
      required: required(),
      style: name() ? visuallyHiddenInput : visuallyHidden,
      tabindex: -1,
      type: 'checkbox',
      'aria-hidden': true,
      ref: componentProps.inputRef,
      // Port note: React's `onChange` on checkboxes is driven by the `click` event, which runs
      // before the browser commits the toggle, so it can still be reverted with
      // `preventDefault()`. The native `change` event can't, so this handles the `click` event.
      onClick(event: MouseEvent) {
        // The click dispatched from the root's `onClick` is an implementation detail
        // and must not reach ancestors, which already receive the original click.
        event.stopPropagation();

        if (event.defaultPrevented) {
          return;
        }

        if (untrack(readOnly)) {
          event.preventDefault();
          return;
        }

        const input = event.currentTarget as HTMLInputElement;
        const nextChecked = input.checked;
        const eventDetails = createChangeEventDetails(REASONS.none, event);

        componentProps.onCheckedChange?.(nextChecked, eventDetails);

        if (!eventDetails.isCanceled) {
          setCheckedState(nextChecked);
        }

        // Port note: React restores a controlled input's `checked` when the state doesn't
        // follow the change (canceled, or a controlled value the consumer didn't update).
        // Solid doesn't, so restore it once the update has been applied.
        flush();
        const currentChecked = untrack(checked);
        if (input.checked !== currentChecked) {
          input.checked = currentChecked;
        }
      },
      onFocus() {
        switchRef.current?.focus();
      },
      ...(componentProps.value !== undefined ? { value: componentProps.value } : EMPTY_OBJECT),
    },
  ];

  const state = createMemo<SwitchRootState>(() => ({
    ...fieldState(),
    checked: checked(),
    disabled: disabled(),
    readOnly: readOnly(),
    required: required(),
  }));

  return (
    <SwitchRootContext value={state}>
      {useRenderElement('span', componentProps, {
        state,
        ref: [
          (element: HTMLElement | null) => {
            switchRef.current = element;
          },
          buttonRef,
        ],
        props: () => [
          rootProps(),
          elementProps,
          getButtonProps,
          (props: Record<string, any>) => validation.getValidationProps(disabled(), props),
        ],
        stateAttributesMapping,
      })}
      <Show when={!checked() && name() && componentProps.uncheckedValue !== undefined}>
        <input
          type="hidden"
          form={componentProps.form}
          name={name()}
          value={componentProps.uncheckedValue}
          disabled={disabled()}
        />
      </Show>
      {useRenderElement('input', EMPTY_OBJECT, {
        ref: handleInputRef,
        props: inputProps,
      })}
    </SwitchRootContext>
  );
}

export interface SwitchRootState extends FieldRootState {
  /**
   * Whether the switch is currently active.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   */
  readOnly: boolean;
  /**
   * Whether the user must activate the switch before submitting a form.
   */
  required: boolean;
}

export interface SwitchRootProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'span', SwitchRootState>, 'onChange'> {
  /**
   * The id of the hidden input element.
   *
   * When `nativeButton` is `true`, the id is applied to the root element.
   */
  id?: string | undefined;
  /**
   * Whether the switch is currently active.
   *
   * To render an uncontrolled switch, use the `defaultChecked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the switch is initially active.
   *
   * To render a controlled switch, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: ((element: HTMLInputElement) => void) | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the switch is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Event handler called when the switch is activated or deactivated.
   */
  onCheckedChange?:
    ((checked: boolean, eventDetails: SwitchRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must activate the switch before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The value submitted with the form when the switch is on.
   * By default, switch submits the "on" value, matching native checkbox behavior.
   */
  value?: string | undefined;
  /**
   * The value submitted with the form when the switch is off.
   * By default, unchecked switches do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
}

export type SwitchRootChangeEventReason = typeof REASONS.none;
export type SwitchRootChangeEventDetails = BaseUIChangeEventDetails<SwitchRoot.ChangeEventReason>;

export namespace SwitchRoot {
  export type State = SwitchRootState;
  export type Props = SwitchRootProps;
  export type ChangeEventReason = SwitchRootChangeEventReason;
  export type ChangeEventDetails = SwitchRootChangeEventDetails;
}
