import { createMemo, flush, omit, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect, useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui-solid/utils/visuallyHidden';
import { ownerWindow } from '@base-ui-solid/utils/owner';
import { getDefaultFormSubmitter } from '@base-ui-solid/utils/getDefaultFormSubmitter';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { getCheckboxStateAttributesMapping } from '../utils/getCheckboxStateAttributesMapping';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type {
  BaseUIComponentProps,
  BaseUIEvent,
  HTMLProps,
  NonNativeButtonProps,
} from '../../internals/types';
import { useButton } from '../../internals/use-button/useButton';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFieldItemContext } from '../../field/item/FieldItemContext';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '../../internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { useCheckboxGroupContext } from '../../checkbox-group/CheckboxGroupContext';
import { CheckboxRootContext } from './CheckboxRootContext';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useValueChanged } from '../../internals/useValueChanged';

export const PARENT_CHECKBOX = 'data-parent';

type GroupProps = Partial<Omit<CheckboxRoot.Props, 'class'>> & Record<string, any>;

/**
 * Represents the checkbox itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Checkbox](https://base-ui-solid.pages.dev/solid/components/checkbox)
 */
export function CheckboxRoot(componentProps: CheckboxRoot.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'checked',
    'class',
    'defaultChecked',
    'aria-labelledby',
    'disabled',
    'form',
    'id',
    'indeterminate',
    'inputRef',
    'name',
    'onCheckedChange',
    'parent',
    'readOnly',
    'render',
    'required',
    'uncheckedValue',
    'value',
    'nativeButton',
    'style',
  );

  const nativeButton = () => componentProps.nativeButton ?? false;
  const parent = () => componentProps.parent ?? false;
  const readOnly = () => componentProps.readOnly ?? false;
  const required = () => componentProps.required ?? false;
  const indeterminate = () => componentProps.indeterminate ?? false;
  const nameProp = () => componentProps.name;
  const valueProp = () => componentProps.value;

  const { clearErrors } = useFormContext();
  const {
    disabled: rootDisabled,
    name: fieldName,
    setDirty,
    setFilled,
    setTouched,
    state: fieldState,
    validationMode,
    validityData,
    validation: localValidation,
  } = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const { labelId, registerControlId, getDescriptionProps } = useLabelableContext();

  const groupContext = useCheckboxGroupContext();
  const parentContext = () =>
    groupContext?.allValues() === undefined ? undefined : groupContext.parent;
  const isGroupedWithParent = () => parentContext() !== undefined;

  const disabled = () =>
    (rootDisabled() ?? false) ||
    fieldItemContext.disabled() ||
    (groupContext?.disabled() ?? false) ||
    (componentProps.disabled ?? false);
  const name = () => fieldName() ?? nameProp();
  const value = () => valueProp() ?? name();

  const id = useBaseUiId();

  // A `CheckboxGroup` is the field's control and takes its name from `aria-labelledby`, so the
  // checkboxes sharing its labelable scope must not claim the field's control id: they would all
  // render that one id and collide. A `Field.Item` opens a scope the checkbox does own.
  const ownsControlId = groupContext?.registerControlId !== registerControlId;

  // `|| undefined` rather than `??`: an empty `id` falls back to the scope's control id.
  const controlId = useLabelableId({
    id: () => componentProps.id || undefined,
    enabled: () => ownsControlId,
  });

  const rootId = () => (nativeButton() ? controlId() : id);

  const groupProps = createMemo<GroupProps>(() => {
    const context = parentContext();
    if (context) {
      if (parent()) {
        return context.getParentProps();
      }
      const currentValue = value();
      if (currentValue !== undefined) {
        return context.getChildProps(currentValue);
      }
    }
    return {};
  });

  const groupChecked = () => groupProps().checked ?? componentProps.checked;
  const groupIndeterminate = () => groupProps().indeterminate ?? indeterminate();
  const otherGroupProps = () => {
    const {
      checked: ignoredChecked,
      indeterminate: ignoredIndeterminate,
      onCheckedChange: ignoredOnCheckedChange,
      ...rest
    } = groupProps();
    return rest as HTMLProps;
  };

  const groupValue = () => groupContext?.value();

  const controlRef: RefObject<HTMLElement | null> = { current: null };
  const setFocused = useSetFieldFocused(disabled, () => controlRef.current);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const validation = groupContext?.validation ?? localValidation;

  const [checked, setCheckedState] = useControlled({
    controlled: () => {
      const currentValue = value();
      const currentGroupValue = groupValue();
      return currentValue !== undefined && currentGroupValue !== undefined && !parent()
        ? currentGroupValue.includes(currentValue)
        : groupChecked();
    },
    // Port note: keep the default reactive for upstream's development warning; state initializes once.
    get default() {
      return componentProps.defaultChecked ?? false;
    },
    name: 'Checkbox',
    state: 'checked',
  });

  const computedChecked = () => (isGroupedWithParent() ? Boolean(groupChecked()) : checked());
  const computedIndeterminate = () =>
    isGroupedWithParent() ? groupIndeterminate() || indeterminate() : indeterminate();

  useRegisterFieldControl(
    controlRef,
    () => id,
    checked,
    undefined,
    () => !groupContext && !disabled(),
    nameProp,
  );

  let inputElement: HTMLInputElement | null = null;
  let unregisterInput: void | (() => void);
  const registeredInputValue = () => (groupContext ? value() : undefined);

  const syncInputRegistration = (element: HTMLInputElement | null) => {
    unregisterInput?.();
    unregisterInput = undefined;
    if (element && !untrack(parent)) {
      unregisterInput = validation.registerInput(element, {
        controlRef,
        value: untrack(registeredInputValue),
      });
    }
  };

  const inputRefCallback = (element: HTMLInputElement | null) => {
    inputElement = element;
    syncInputRegistration(element);
    const inputRefProp = untrack(() => componentProps.inputRef);
    if (typeof inputRefProp === 'function') {
      inputRefProp(element as HTMLInputElement);
    }
  };

  // Port note: upstream re-registers the input through a new ref callback when its registered
  // value or `parent` changes, and unregisters it when the input unmounts.
  useIsoLayoutEffect(
    () => {
      syncInputRegistration(inputElement);
      return () => {
        unregisterInput?.();
        unregisterInput = undefined;
      };
    },
    () => [registeredInputValue(), parent()],
  );

  const ariaLabelledBy = useAriaLabelledBy(
    () => componentProps['aria-labelledby'] || undefined,
    labelId,
    () => inputElement,
    () => !nativeButton(),
    controlId,
    () => componentProps['aria-label'] || undefined,
  );

  useIsoLayoutEffect(
    ([isChecked, isIndeterminate]) => {
      if (inputElement) {
        // Re-assert on `checked` changes too: clicking the input natively resets `indeterminate`.
        inputElement.indeterminate = isIndeterminate;
      }
      // Inside a group, the group derives the filled state from its value.
      if (!groupContext) {
        setFilled(isChecked);
      }
    },
    () => [checked(), computedIndeterminate()],
  );

  useValueChanged(checked, () => {
    if (groupContext) {
      return;
    }

    const currentChecked = untrack(checked);
    clearErrors(untrack(name));
    setDirty(currentChecked !== untrack(validityData).initialValue);

    validation.change(currentChecked);
  });

  // Port note: React restores a controlled input's `checked` when the consumer doesn't accept the
  // change. Solid doesn't, so restore it once the update has been applied.
  function syncInputChecked(input: HTMLInputElement) {
    flush();
    const currentChecked = untrack(checked);
    if (input.checked !== currentChecked) {
      input.checked = currentChecked;
    }
  }

  // Port note: upstream handles React's `onChange`, which React derives from the `click` event for
  // checkboxes, so this listens to `click` directly. Like React's, the handler is delegated: it
  // runs after native listeners on the input, so their `preventDefault()` is visible here.
  function handleInputClick(event: MouseEvent) {
    // The click dispatched from the root's `onClick` is an implementation detail
    // and must not reach ancestors, which already receive the original click.
    event.stopPropagation();

    // Workaround for https://github.com/react/react/issues/9023
    if (event.defaultPrevented) {
      return;
    }

    if (untrack(readOnly)) {
      event.preventDefault();
      return;
    }

    const input = event.currentTarget as HTMLInputElement;
    const nextChecked = input.checked;
    const details = createChangeEventDetails(REASONS.none, event);

    componentProps.onCheckedChange?.(nextChecked, details);

    if (details.isCanceled) {
      syncInputChecked(input);
      return;
    }

    untrack(() => groupProps().onCheckedChange)?.(nextChecked, details);

    if (details.isCanceled) {
      syncInputChecked(input);
      return;
    }

    setCheckedState(nextChecked);

    const currentValue = untrack(value);
    if (
      currentValue !== undefined &&
      groupContext !== undefined &&
      !untrack(parent) &&
      !untrack(isGroupedWithParent)
    ) {
      const currentGroupValue = untrack(groupContext.value);
      const nextGroupValue = nextChecked
        ? [...currentGroupValue, currentValue]
        : currentGroupValue.filter((item) => item !== currentValue);

      groupContext.setValue(nextGroupValue, details);
    }

    syncInputChecked(input);
  }

  const inputAriaProps = createMemo(
    () => validation.getValidationProps(disabled(), getDescriptionProps({})) as Record<string, any>,
  );

  // React <19 sets an empty value if `undefined` is passed explicitly
  // To avoid this, we only set the value if it's defined
  // Port note: Solid also sets `''` for an `undefined` value.
  const inputValueProps = () => {
    const currentValueProp = valueProp();
    return currentValueProp !== undefined
      ? {
          value: (groupContext ? checked() && currentValueProp : currentValueProp) || '',
        }
      : {};
  };

  useEffect(
    ([context, isDisabled, currentValue]) => {
      if (!context || currentValue === undefined) {
        return undefined;
      }

      const disabledStates = context.disabledStatesRef.current;
      disabledStates.set(currentValue, isDisabled);

      return () => {
        disabledStates.delete(currentValue);
      };
    },
    () => [parentContext(), disabled(), value()] as const,
  );

  const state = createMemo<CheckboxRootState>(
    () => ({
      ...fieldState(),
      checked: computedChecked(),
      disabled: disabled(),
      readOnly: readOnly(),
      required: required(),
      indeterminate: computedIndeterminate(),
    }),
    { equals: fastObjectShallowCompare },
  );

  let rootElement: HTMLElement | null = null;

  // Port note: upstream reads the id off the rendered React element. The rendered DOM element is
  // read here instead, so an `id` set by a `render` function is picked up too.
  useIsoLayoutEffect(
    ([registerChildId, isParent, currentValue]) => {
      const renderedId = rootElement?.id || undefined;
      if (!registerChildId || isParent || currentValue === undefined || renderedId === undefined) {
        return undefined;
      }

      return registerChildId(currentValue, renderedId);
    },
    () => [parentContext()?.registerChildId, parent(), value(), rootId()] as const,
  );

  return (
    <CheckboxRootContext value={state}>
      {useRenderElement('span', componentProps, {
        state,
        ref: [
          buttonRef,
          (element: HTMLElement | null) => {
            controlRef.current = element;
            rootElement = element;
          },
        ],
        props: () => [
          {
            id: rootId(),
            role: 'checkbox',
            'aria-checked': computedIndeterminate() ? 'mixed' : computedChecked(),
            'aria-readonly': readOnly() || undefined,
            'aria-required': required() || undefined,
            'aria-labelledby': ariaLabelledBy(),
            [PARENT_CHECKBOX as string]: parent() ? '' : undefined,
            onFocus() {
              setFocused(true);
            },
            onBlur() {
              const inputEl = inputElement;
              if (!inputEl) {
                return;
              }

              setTouched(true);
              setFocused(false);

              if (untrack(validationMode) === 'onBlur') {
                validation.commit(groupContext ? untrack(groupValue) : inputEl.checked);
              }
            },
            onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
              if (event.key !== 'Enter') {
                return;
              }

              // Let consumer `preventDefault()` handlers opt out while defensively stopping
              // any remaining Base UI Enter handling from treating the checkbox as a button.
              event.preventBaseUIHandler();

              if (event.defaultPrevented) {
                return;
              }

              const formToSubmit = inputElement?.form ?? null;
              const currentTarget = event.currentTarget as Element;
              const originalPreventDefault = event.preventDefault;
              let preventDefaultCalledAfterPropagation = false;

              event.preventDefault = () => {
                preventDefaultCalledAfterPropagation = true;
                originalPreventDefault.call(event);
              };

              // Enter should not activate/toggle the checkbox. Cancel the native button behavior.
              // Port note: there are no synthetic events, so ancestors see `defaultPrevented` set
              // already; they opt out of the implicit submission by calling `preventDefault()`
              // during propagation, which is detected through the patched method.
              originalPreventDefault.call(event);

              ownerWindow(currentTarget).queueMicrotask(() => {
                event.preventDefault = originalPreventDefault;

                if (!preventDefaultCalledAfterPropagation) {
                  getDefaultFormSubmitter(formToSubmit)?.click();
                }
              });
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
          },
          elementProps,
          otherGroupProps(),
          getButtonProps,
          getDescriptionProps,
          (props: HTMLProps) => validation.getValidationProps(disabled(), props),
        ],
        stateAttributesMapping: getCheckboxStateAttributesMapping(state),
      })}
      <Show
        when={
          !checked() &&
          !groupContext &&
          name() &&
          !parent() &&
          componentProps.uncheckedValue !== undefined
        }
      >
        <input
          type="hidden"
          form={componentProps.form}
          name={name()}
          value={componentProps.uncheckedValue}
          disabled={disabled()}
        />
      </Show>
      <input
        ref={inputRefCallback}
        type="checkbox"
        checked={checked()}
        disabled={disabled()}
        form={componentProps.form}
        // parent checkboxes unset `name` to be excluded from form submission
        name={parent() ? undefined : name()}
        // Set `id` to stop Chrome warning about an unassociated input.
        // When using a native button, the `id` is applied to the button instead.
        id={nativeButton() ? undefined : controlId()}
        required={required()}
        style={name() ? visuallyHiddenInput : visuallyHidden}
        tabindex={-1}
        aria-hidden="true"
        aria-describedby={inputAriaProps()['aria-describedby']}
        aria-invalid={inputAriaProps()['aria-invalid'] ? 'true' : undefined}
        onClick={handleInputClick}
        onFocus={() => {
          controlRef.current?.focus();
        }}
        {...inputValueProps()}
      />
    </CheckboxRootContext>
  );
}

export interface CheckboxRootState extends FieldRootState {
  /**
   * Whether the checkbox is currently ticked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   */
  readOnly: boolean;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   */
  required: boolean;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   */
  indeterminate: boolean;
}

export interface CheckboxRootProps
  extends
    NonNativeButtonProps,
    Omit<BaseUIComponentProps<'span', CheckboxRootState>, 'onChange' | 'value'> {
  /**
   * The id of the input element.
   */
  id?: string | undefined;
  /**
   * Identifies the field when a form is submitted.
   * @default undefined
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the checkbox is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Whether the checkbox is currently ticked.
   *
   * To render an uncontrolled checkbox, use the `defaultChecked` prop instead.
   * @default undefined
   */
  checked?: boolean | undefined;
  /**
   * Whether the checkbox is initially ticked.
   *
   * To render a controlled checkbox, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Event handler called when the checkbox is ticked or unticked.
   */
  onCheckedChange?:
    ((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void) | undefined;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   * @default false
   */
  indeterminate?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: ((element: HTMLInputElement) => void) | undefined;
  /**
   * Whether the checkbox controls a group of child checkboxes.
   *
   * Must be used in a [Checkbox Group](https://base-ui-solid.pages.dev/solid/components/checkbox-group).
   * @default false
   */
  parent?: boolean | undefined;
  /**
   * The value submitted with the form when the checkbox is unchecked.
   * By default, unchecked checkboxes do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
  /**
   * The checkbox's value. Identifies it within a [Checkbox Group](https://base-ui-solid.pages.dev/solid/components/checkbox-group), falling back to `name` when omitted.
   * When submitting a form, a checked box submits `value`; with no `value`, it submits the native "on".
   */
  value?: string | undefined;
}

export type CheckboxRootChangeEventReason = typeof REASONS.none;
export type CheckboxRootChangeEventDetails =
  BaseUIChangeEventDetails<CheckboxRoot.ChangeEventReason>;

export namespace CheckboxRoot {
  export type State = CheckboxRootState;
  export type Props = CheckboxRootProps;
  export type ChangeEventReason = CheckboxRootChangeEventReason;
  export type ChangeEventDetails = CheckboxRootChangeEventDetails;
}
