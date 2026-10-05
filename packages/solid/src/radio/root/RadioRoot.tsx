import { createMemo, flush, omit, onCleanup, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui-solid/utils/visuallyHidden';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '../../internals/types';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { NOOP } from '../../internals/noop';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import { ACTIVE_COMPOSITE_ITEM } from '../../internals/composite/constants';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { useFieldItemContext } from '../../field/item/FieldItemContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '../../internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { useRadioGroupContext } from '../../radio-group/RadioGroupContext';
import { serializeValue } from '../../internals/serializeValue';
import { RadioRootContext } from './RadioRootContext';

/**
 * Represents the radio button itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Radio](https://base-ui-solid.pages.dev/solid/components/radio-group)
 */
export function RadioRoot<Value>(componentProps: RadioRoot.Props<Value>): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'disabled',
    'readOnly',
    'required',
    'aria-labelledby',
    'value',
    'inputRef',
    'nativeButton',
    'id',
    'style',
  );

  const groupContext = useRadioGroupContext();
  const validation = groupContext?.validation;

  const {
    setTouched: setFieldTouched,
    setFilled,
    state: fieldState,
    disabled: fieldDisabled,
  } = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const { labelId, getDescriptionProps } = useLabelableContext();

  const nativeButton = () => componentProps.nativeButton ?? false;
  const disabled = () =>
    Boolean(
      fieldDisabled() ||
      fieldItemContext.disabled() ||
      groupContext?.disabled() ||
      (componentProps.disabled ?? false),
    );
  const readOnly = () => Boolean(groupContext?.readOnly() || (componentProps.readOnly ?? false));
  const required = () => Boolean(groupContext?.required() || (componentProps.required ?? false));

  const checked = () =>
    groupContext
      ? groupContext.checkedValue() === componentProps.value
      : componentProps.value === '';

  const radioRef: RefObject<HTMLElement | null> = { current: null };
  const setFieldFocused = useSetFieldFocused(disabled, () => radioRef.current);
  let inputElement: HTMLInputElement | null = null;

  // Port note: upstream merges these into the input's ref callback (React 19 ref cleanups).
  // The hidden input is created once, so they're attached when it's created and detached when
  // the radio is disposed.
  let unregisterFieldInput: (() => void) | void | undefined;
  let unregisterGroupInput: (() => void) | undefined;
  const handleInputRef = (element: HTMLInputElement | null) => {
    if (!element || element === inputElement) {
      return;
    }
    inputElement = element;
    componentProps.inputRef?.(element);

    unregisterFieldInput = validation?.registerInput(element, {
      controlRef: radioRef,
      value: undefined,
    });
  };

  onCleanup(() => {
    unregisterGroupInput?.();
    unregisterFieldInput?.();
    unregisterGroupInput = undefined;
    unregisterFieldInput = undefined;
  });

  useIsoLayoutEffect(
    () => {
      if (inputElement?.checked) {
        setFilled(true);
      }
    },
    () => [],
  );

  useIsoLayoutEffect(
    ([isChecked, isDisabled]) => {
      if (!inputElement || !groupContext) {
        return;
      }

      // Port note: upstream also registers from the input's ref callback, where React has
      // already applied `disabled`/`checked`. Solid runs ref callbacks before applying the
      // props, so the attach-time registration (and its detach cleanup) happens here instead.
      if (!unregisterGroupInput) {
        unregisterGroupInput = groupContext.registerInputRef(inputElement) ?? NOOP;
      }

      if (isDisabled && isChecked) {
        void groupContext.registerInputRef(null);
        return;
      }

      void groupContext.registerInputRef(inputElement);
    },
    () => [checked(), disabled()],
  );

  const id = useBaseUiId();
  const inputId = useLabelableId({ id: () => componentProps.id as string | undefined });
  const hiddenInputId = () => (nativeButton() ? undefined : inputId());
  const ariaLabelledBy = useAriaLabelledBy(
    () => componentProps['aria-labelledby'] as string | undefined,
    labelId,
    () => inputElement,
    () => !nativeButton(),
    hiddenInputId,
    () => componentProps['aria-label'] as string | undefined,
  );

  const rootProps = () => ({
    role: 'radio',
    'aria-checked': checked(),
    'aria-labelledby': ariaLabelledBy(),
    [ACTIVE_COMPOSITE_ITEM as string]: checked() ? '' : undefined,
    id: nativeButton() ? inputId() : id,
    onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        // Radio only activates with Space. Preventing the keydown's default
        // stops useButton from turning Enter into a click.
        event.preventDefault();
      }
    },
    onClick(event: MouseEvent) {
      if (event.defaultPrevented || untrack(disabled) || untrack(readOnly)) {
        return;
      }

      event.preventDefault();

      const input = inputElement;
      if (!input) {
        return;
      }

      dispatchClickWithModifiers(input, event);
    },
    // Port note: React's `onFocus`/`onBlur` bubble (they listen to `focusin`/`focusout`).
    onFocusIn(event: FocusEvent) {
      setFieldFocused(true);

      if (
        event.defaultPrevented ||
        untrack(disabled) ||
        untrack(readOnly) ||
        !(groupContext?.touched() ?? false)
      ) {
        return;
      }

      inputElement?.click();

      groupContext?.setTouched(false);
    },
    onFocusOut() {
      // A grouped radio's exit is cleared by the group's `contains`-guarded blur handler, so
      // radio-to-radio moves inside the group don't churn the focused state.
      if (!groupContext) {
        setFieldFocused(false);
      }
    },
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
    composite: () => false,
  });

  const inputProps = (): Record<string, any> => {
    const value = componentProps.value;
    return {
      type: 'radio',
      form: groupContext?.form(),
      id: hiddenInputId(),
      name: groupContext?.name(),
      tabindex: -1,
      style: groupContext?.name() ? visuallyHiddenInput : visuallyHidden,
      'aria-hidden': true,
      ...(value !== undefined ? { value: serializeValue(value) } : EMPTY_OBJECT),
      disabled: disabled(),
      checked: checked(),
      required: required(),
      readonly: readOnly(),
      // Port note: React's `onChange` on radios is driven by the `click` event, which runs before
      // the browser commits the change, so it can still be reverted. The native `change` event
      // can't, so this handles the `click` event.
      onClick(event: MouseEvent) {
        // Clicks dispatched on the input from the root's `onClick` and `onFocus` are an
        // implementation detail and must not reach ancestors.
        event.stopPropagation();

        if (event.defaultPrevented) {
          return;
        }

        const input = event.currentTarget as HTMLInputElement;
        // React only reports a change when the checkedness differs from the rendered one.
        if (!input.checked || untrack(checked)) {
          return;
        }

        const radioValue = untrack(() => componentProps.value);

        if (!untrack(disabled) && !untrack(readOnly) && radioValue !== undefined) {
          const details = createChangeEventDetails(REASONS.none, event);

          groupContext?.setCheckedValue(radioValue, details);

          if (!details.isCanceled) {
            setFieldTouched(true);
          }
        }

        // Port note: React restores a controlled input's `checked` when the state doesn't
        // follow the change (canceled, read-only, or a controlled value the consumer didn't
        // update). Solid doesn't, so once the update has been applied, cancel the click's
        // activation instead: the browser then restores the previously checked radio, too.
        flush();
        if (!untrack(checked)) {
          event.preventDefault();
        }
      },
      onFocus() {
        radioRef.current?.focus();
      },
    };
  };

  const state = createMemo<RadioRootState>(
    () => ({
      ...fieldState(),
      required: required(),
      disabled: disabled(),
      readOnly: readOnly(),
      checked: checked(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const refs = [
    (element: HTMLElement | null) => {
      radioRef.current = element;
    },
    buttonRef,
  ];
  const props = () => [
    rootProps(),
    elementProps,
    getButtonProps,
    getDescriptionProps,
    validation
      ? (validationProps: HTMLProps) => validation.getValidationProps(disabled(), validationProps)
      : EMPTY_OBJECT,
  ];

  // Port note: whether the radio is in a group can't change, so the branch is decided once.
  return (
    <RadioRootContext value={state}>
      {groupContext ? (
        <CompositeItem
          tag="span"
          render={componentProps.render}
          class={componentProps.class}
          style={componentProps.style}
          state={state()}
          refs={refs}
          props={props()}
          stateAttributesMapping={stateAttributesMapping}
        />
      ) : (
        useRenderElement('span', componentProps, {
          state,
          ref: refs,
          props,
          stateAttributesMapping,
        })
      )}
      {useRenderElement('input', EMPTY_OBJECT, {
        ref: handleInputRef,
        props: inputProps,
      })}
    </RadioRootContext>
  );
}

export interface RadioRootState extends FieldRootState {
  /**
   * Whether the radio button is currently selected.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly: boolean;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required: boolean;
  /**
   * Whether the radio button has been touched (when wrapped in Field.Root).
   */
  touched: boolean;
  /**
   * Whether the radio button's value has changed from its initial value (when wrapped in Field.Root).
   */
  dirty: boolean;
  /**
   * Whether the radio button is in a valid state (when wrapped in Field.Root).
   */
  valid: boolean | null;
  /**
   * Whether the radio button has a value (when wrapped in Field.Root).
   */
  filled: boolean;
  /**
   * Whether the radio button is focused (when wrapped in Field.Root).
   */
  focused: boolean;
}

export interface RadioRootProps<Value = any>
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'span', RadioRootState>, 'value'> {
  /**
   * The unique identifying value of the radio in a group.
   */
  value: Value;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly?: boolean | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: ((element: HTMLInputElement) => void) | undefined;
}

export namespace RadioRoot {
  export type State = RadioRootState;
  export type Props<TValue = any> = RadioRootProps<TValue>;
}
