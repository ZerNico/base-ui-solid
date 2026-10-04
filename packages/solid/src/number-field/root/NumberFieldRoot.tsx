import { createMemo, createSignal, omit, untrack } from 'solid-js';
import { isServer } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect, useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui-solid/utils/visuallyHidden';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { platform } from '@base-ui-solid/utils/platform';
import { formatNumber } from '@base-ui-solid/utils/formatNumber';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { activeElement } from '../../floating-ui-solid/utils';
import type { InputMode } from './NumberFieldRootContext';
import { NumberFieldRootContext } from './NumberFieldRootContext';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useFormContext } from '../../internals/form-context/FormContext';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import type { BaseUIComponentProps } from '../../internals/types';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import {
  getFormatParts,
  getNumberLocaleDetails,
  PERMILLE,
  PERCENTAGES,
  SPACE_SEPARATOR_RE,
  BASE_NON_NUMERIC_SYMBOLS,
  MINUS_SIGNS_WITH_ASCII,
  PLUS_SIGNS_WITH_ASCII,
} from '../utils/parse';
import { toValidatedNumber } from '../utils/validate';
import type {
  EventWithOptionalKeyState,
  ChangeEventCustomProperties,
  IncrementValueParameters,
} from '../utils/types';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
  ReasonToEvent,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

/**
 * Groups all parts of the number field and manages its state.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldRoot(componentProps: NumberFieldRoot.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'id',
    'min',
    'max',
    'smallStep',
    'step',
    'largeStep',
    'required',
    'disabled',
    'readOnly',
    'form',
    'name',
    'defaultValue',
    'value',
    'onValueChange',
    'onValueCommitted',
    'allowWheelScrub',
    'snapOnStep',
    'allowOutOfRange',
    'format',
    'locale',
    'render',
    'class',
    'inputRef',
    'style',
  );

  const min = () => componentProps.min;
  const max = () => componentProps.max;
  const smallStep = () => componentProps.smallStep ?? 0.1;
  const stepProp = () => componentProps.step ?? 1;
  const largeStep = () => componentProps.largeStep ?? 10;
  const required = () => componentProps.required ?? false;
  const readOnly = () => componentProps.readOnly ?? false;
  const nameProp = () => componentProps.name;
  const allowWheelScrub = () => componentProps.allowWheelScrub ?? false;
  const snapOnStep = () => componentProps.snapOnStep ?? false;
  const allowOutOfRange = () => componentProps.allowOutOfRange ?? false;
  const format = () => componentProps.format;
  const locale = () => componentProps.locale;

  const {
    setDirty,
    validityData,
    disabled: fieldDisabled,
    setFilled,
    name: fieldName,
    state: fieldState,
    validation,
  } = useFieldRootContext();
  const { clearErrors } = useFormContext();

  const disabled = () => (fieldDisabled() ?? false) || (componentProps.disabled ?? false);
  const name = () => fieldName() ?? nameProp();
  const step = () => {
    const currentStep = stepProp();
    return currentStep === 'any' ? 1 : currentStep;
  };

  const [isScrubbing, setIsScrubbing] = createSignal(false);

  const minWithDefault = () => min() ?? Number.MIN_SAFE_INTEGER;
  const maxWithDefault = () => max() ?? Number.MAX_SAFE_INTEGER;
  const minWithZeroDefault = () => min() ?? 0;
  const formatStyle = () => format()?.style;

  const inputRef: RefObject<HTMLInputElement | null> = { current: null };
  const hiddenInputRef = (element: HTMLInputElement | null) => {
    validation.inputRef.current = element;
    if (element) {
      componentProps.inputRef?.(element);
    }
  };

  const id = useLabelableId({ id: () => componentProps.id });

  const [value, setValueUnwrapped] = useControlled<number | null>({
    controlled: () => componentProps.value,
    // Port note: keep the default reactive for upstream's development warning; state initializes once.
    get default() {
      return componentProps.defaultValue ?? null;
    },
    name: 'NumberField',
    state: 'value',
  });

  // Port note: upstream calls `forceRender()` so that the layout effects which run on every
  // render (syncing `valueRef` and the formatted input value) re-run even when the value didn't
  // change. Here it's a counter signal that those effects depend on (a counter, because
  // `useIsoLayoutEffect` only re-runs when a dependency changes).
  const [renderTick, setRenderTick] = createSignal(0);
  const forceRender = () => setRenderTick((tick) => tick + 1);

  // Port note: `useValueAsRef` updates the ref in a layout effect after every render. The
  // stepper buttons write to it directly, so it stays a mutable box, synced from the state.
  const valueRef: RefObject<number | null> = { current: untrack(value) };

  useIsoLayoutEffect(
    ([currentValue]) => {
      setFilled(currentValue !== null);
    },
    () => [value()],
  );

  // Port note: read lazily instead of being synced after render, so it always holds the latest
  // `format` prop.
  const formatOptionsRef: RefObject<Intl.NumberFormatOptions | undefined> = {
    get current() {
      return untrack(format);
    },
  };

  const hasPendingCommitRef: RefObject<boolean> = { current: false };

  function onValueCommitted(
    nextValue: number | null,
    eventDetails: NumberFieldRoot.CommitEventDetails,
  ) {
    hasPendingCommitRef.current = false;
    componentProps.onValueCommitted?.(nextValue, eventDetails);
  }

  const allowInputSyncRef: RefObject<boolean | null> = { current: true };
  const lastChangedValueRef: RefObject<number | null> = { current: null };

  // During SSR, the value is formatted on the server, whose locale may differ from the client's
  // locale. This causes a hydration mismatch, which we manually suppress. This is preferable to
  // rendering an empty input field and then updating it with the formatted value, as the user
  // can still see the value prior to hydration, even if it's not formatted correctly.
  const [inputValue, setInputValue] = createSignal(
    untrack(() => formatNumber(value(), locale(), format())),
  );
  const [inputMode, setInputMode] = createSignal<InputMode>('numeric');

  function getAllowedNonNumericKeys() {
    const currentLocale = untrack(locale);
    const currentFormat = untrack(format);
    const parts = getFormatParts(currentLocale, currentFormat);

    const keys = new Set<string>(BASE_NON_NUMERIC_SYMBOLS);
    const addAll = (chars: readonly string[]) => chars.forEach((char) => keys.add(char));

    // Integer formats omit the decimal from `parts`, so fall back to the locale's separator in that
    // case; it must stay typeable regardless of whether the format renders a fraction.
    const decimal =
      parts.find((part) => part.type === 'decimal')?.value ??
      getNumberLocaleDetails(currentLocale, currentFormat).decimal;
    keys.add(decimal);

    // Allow every non-digit character the formatter renders — separators, currency symbols, units
    // (e.g. `km/h`, `°C`), exponent separators, and locale literals — decomposed per character
    // because the input validates the typed string one character at a time. Deriving these from
    // the formatter covers multi-character and locale-specific symbols of every part type
    // uniformly. `compact` suffixes (e.g. `K`/`M`) are excluded because `parseNumber` can't reverse
    // them, so allowing them would yield a silently incorrect value.
    parts.forEach((part) => {
      if (
        part.type === 'integer' ||
        part.type === 'fraction' ||
        part.type === 'exponentInteger' ||
        part.type === 'compact'
      ) {
        return;
      }
      addAll(Array.from(part.value));
      if (SPACE_SEPARATOR_RE.test(part.value)) {
        keys.add(' ');
      }
    });

    const currentFormatStyle = untrack(formatStyle);
    const allowPercentSymbols =
      currentFormatStyle === 'percent' ||
      (currentFormatStyle === 'unit' && currentFormat?.unit === 'percent');
    const allowPermilleSymbols =
      currentFormatStyle === 'percent' ||
      (currentFormatStyle === 'unit' && currentFormat?.unit === 'permille');

    // Tolerate percent/permille variants the formatter doesn't emit but users may type or paste.
    if (allowPercentSymbols) {
      addAll(PERCENTAGES);
    }
    if (allowPermilleSymbols) {
      addAll(PERMILLE);
    }

    // Allow plus sign in all cases; minus sign when negatives are valid, or when out-of-range
    // entry is allowed so native underflow validation can be triggered from the keyboard.
    addAll(PLUS_SIGNS_WITH_ASCII);
    if (untrack(minWithDefault) < 0 || untrack(allowOutOfRange)) {
      addAll(MINUS_SIGNS_WITH_ASCII);
    }

    return keys;
  }

  function getStepAmount(event?: EventWithOptionalKeyState) {
    if (event?.altKey) {
      return untrack(smallStep);
    }
    if (event?.shiftKey) {
      return untrack(largeStep);
    }
    return untrack(step);
  }

  function setValue(
    unvalidatedValue: number | null,
    details: NumberFieldRoot.ChangeEventDetails,
  ): boolean {
    const eventWithOptionalKeyState = details.event as EventWithOptionalKeyState;
    const dir = details.direction;
    // Port note: like upstream's render-closure `value`, this is the last committed value.
    const currentValue = untrack(value);
    const currentLocale = untrack(locale);
    const currentFormat = untrack(format);

    // Direct text entry (typing, pasting, clearing, autofill) behaves natively; step-based
    // interactions (keyboard arrows, buttons, wheel, scrub) do not. All direct-entry reasons
    // (`input-change`, `input-clear`, `input-blur`, `input-paste`) share the `input-` prefix.
    const isInputReason = details.reason.startsWith('input-') || details.reason === REASONS.none;

    // Only allow out-of-range values for direct text entry. Step-based interactions still clamp.
    const shouldClampValue = !untrack(allowOutOfRange) || !isInputReason;

    const validatedValue = toValidatedNumber(
      unvalidatedValue,
      dir ? getStepAmount(eventWithOptionalKeyState) * dir : undefined,
      untrack(minWithDefault),
      untrack(maxWithDefault),
      untrack(minWithZeroDefault),
      formatOptionsRef.current,
      untrack(snapOnStep),
      eventWithOptionalKeyState?.altKey ?? false,
      shouldClampValue,
    );

    // Notify about a change even when the numeric value is unchanged for input reasons: the
    // typed text may clamp/snap to the current value, or differ while validation normalizes
    // it back to the existing value.
    const shouldFireChange =
      validatedValue !== currentValue ||
      (isInputReason && (unvalidatedValue !== currentValue || allowInputSyncRef.current === false));

    if (shouldFireChange) {
      componentProps.onValueChange?.(validatedValue, details);

      if (details.isCanceled) {
        // Report a vetoed change as not applied, so callers don't commit a value never stored.
        return false;
      }

      setValueUnwrapped(validatedValue);
      setDirty(validatedValue !== untrack(validityData).initialValue);
      hasPendingCommitRef.current = true;
    }

    lastChangedValueRef.current = validatedValue;

    // Keep the visible input in sync immediately when programmatic changes occur
    // (increment/decrement, wheel, etc). During direct typing we don't want
    // to overwrite the user-provided text until blur, so we gate on
    // `allowInputSyncRef`.
    if (allowInputSyncRef.current) {
      setInputValue(formatNumber(validatedValue, currentLocale, currentFormat));
    }

    // Formatting can change even if the numeric value hasn't, so ensure a re-render when needed.
    forceRender();

    return shouldFireChange;
  }

  function incrementValue(
    amount: number,
    { direction, currentValue, event, reason }: IncrementValueParameters,
  ) {
    const prevValue = currentValue == null ? valueRef.current : currentValue;
    const nativeEvent = event as ReasonToEvent<IncrementValueParameters['reason']> | undefined;

    if (typeof prevValue !== 'number') {
      // Seed an empty field with 0; `setValue` clamps it to the in-range value nearest 0
      // (e.g. `max` for a negative range). No `direction`: the seed isn't a step, so it must
      // not be directionally snapped.
      return setValue(0, createChangeEventDetails(reason, nativeEvent));
    }

    return setValue(
      prevValue + amount * direction,
      createChangeEventDetails(reason, nativeEvent, undefined, {
        direction,
      }),
    );
  }

  const state = createMemo<NumberFieldRootState>(() => ({
    ...fieldState(),
    disabled: disabled(),
    readOnly: readOnly(),
    required: required(),
    value: value(),
    inputValue: inputValue(),
    scrubbing: isScrubbing(),
  }));

  // Port note: upstream's `useValueAsRef` syncs the ref after every render. Re-run it whenever
  // the value changes or `setValue` forces a render.
  useIsoLayoutEffect(
    ([currentValue]) => {
      valueRef.current = currentValue;
    },
    () => [value(), renderTick()],
  );

  // We need to update the input value when the external `value` prop changes. This ends up acting
  // as a single source of truth to update the input value, bypassing the need to manually set it in
  // each event handler.
  // This is done inside a layout effect as an alternative to the technique to set state during
  // render as we're accessing a ref, which must be inside an effect.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  //
  // Port note: upstream runs this after every render, since the value can be formatted
  // differently even if it hasn't changed. Here it re-runs whenever the value, the formatting
  // props, or a forced render change. The input value is read untracked, so the effect doesn't
  // depend on the state it writes.
  useIsoLayoutEffect(
    function syncFormattedInputValueOnValueChange([currentValue, currentLocale, currentFormat]) {
      // This ensures the value is only updated on blur rather than every keystroke, but still
      // allows the input value to be updated when the value is changed externally.
      if (!allowInputSyncRef.current) {
        return;
      }

      const nextInputValue = formatNumber(currentValue, currentLocale, currentFormat);

      if (nextInputValue !== untrack(inputValue)) {
        setInputValue(nextInputValue);
      }
    },
    () => [value(), locale(), format(), renderTick()] as const,
  );

  useIsoLayoutEffect(
    function setDynamicInputModeForIOS([currentMinWithDefault]) {
      if (!platform.os.ios) {
        return;
      }

      // iOS numeric software keyboard doesn't have a minus key, so we need to use the default
      // keyboard to let the user input a negative number.
      let computedInputMode: InputMode = 'text';

      if (currentMinWithDefault >= 0) {
        // iOS numeric software keyboard doesn't have a decimal key for "numeric" input mode, but
        // this is better than the "text" input if possible to use.
        computedInputMode = 'decimal';
      }

      setInputMode(computedInputMode);
    },
    () => [minWithDefault()],
  );

  // Programmatic focus leaves the caret at the start (Chrome/Firefox) or selects the whole value
  // (Safari). Store the caret at the end before focusing: every engine restores the stored
  // selection on `focus()`, and a selection the consumer sets in `onFocus` still wins. Keyboard
  // and pointer focus keep the browser's native selection behavior.
  function focusInput() {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const length = input.value.length;
    input.setSelectionRange(length, length);
    input.focus();
  }

  // React attaches `onWheel` as a passive listener, so calling `preventDefault` there is ignored.
  // Attach a native (non-passive) `wheel` listener to the input instead to prevent page scrolling.
  useEffect(
    function registerElementWheelListener([
      currentAllowWheelScrub,
      currentDisabled,
      currentReadOnly,
    ]) {
      const element = inputRef.current;
      if (currentDisabled || currentReadOnly || !currentAllowWheelScrub || !element) {
        return undefined;
      }

      function handleWheel(event: WheelEvent) {
        if (
          // Allow pinch-zooming.
          event.ctrlKey ||
          activeElement(ownerDocument(inputRef.current)) !== inputRef.current
        ) {
          return;
        }

        // Some browsers deliver shift + wheel on the horizontal axis, so there the horizontal
        // delta is the intended vertical one. Touchpads emit sub-pixel noise on the cross axis,
        // so compare the axes rather than requiring an exact zero.
        const isHorizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const delta = event.shiftKey && isHorizontal ? event.deltaX : event.deltaY;

        // Ignore horizontal gestures so the page can scroll instead of scrubbing. Shift is exempt:
        // its gesture is horizontal wherever the browser swaps the axis.
        if (delta === 0 || (!event.shiftKey && isHorizontal)) {
          return;
        }

        // Prevent the default behavior to avoid scrolling the page.
        event.preventDefault();
        allowInputSyncRef.current = true;

        const amount = getStepAmount(event);

        // Each wheel turn is a discrete, final change, so commit it immediately like keyboard
        // steps (gated on an actual change so boundary no-ops don't commit).
        const changed = incrementValue(amount, {
          direction: delta > 0 ? -1 : 1,
          event,
          reason: REASONS.wheel,
        });
        if (changed) {
          onValueCommitted(
            lastChangedValueRef.current,
            createGenericEventDetails(REASONS.wheel, event),
          );
        }
      }

      return addEventListener(element, 'wheel', handleWheel);
    },
    () => [allowWheelScrub(), disabled(), readOnly()],
  );

  const contextValue: NumberFieldRootContext = {
    inputRef,
    focusInput,
    minWithDefault,
    maxWithDefault,
    id,
    setValue,
    incrementValue,
    getStepAmount,
    allowInputSyncRef,
    formatOptionsRef,
    valueRef,
    lastChangedValueRef,
    hasPendingCommitRef,
    name,
    nameProp,
    inputMode,
    getAllowedNonNumericKeys,
    min,
    max,
    setInputValue,
    locale,
    setIsScrubbing,
    state,
    onValueCommitted,
  };

  return (
    <NumberFieldRootContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        state,
        props: elementProps,
        stateAttributesMapping,
      })}
      {useRenderElement('input', EMPTY_OBJECT, {
        ref: hiddenInputRef,
        props: () => [
          validation.getValidationProps(disabled(), {
            onFocus() {
              focusInput();
            },
            // Port note: React's `onChange` fires on every `input` event.
            onInput(event: InputEvent) {
              if (event.defaultPrevented || untrack(disabled) || untrack(readOnly)) {
                return;
              }

              // Handle browser autofill.
              const nextValue = (event.currentTarget as HTMLInputElement).valueAsNumber;
              const parsedValue = Number.isNaN(nextValue) ? null : nextValue;
              const details = createChangeEventDetails(REASONS.none, event);

              // `setValue` updates the dirty flag from the stored (clamped) value, so validate with
              // that same value rather than the raw autofilled one.
              setValue(parsedValue, details);
              clearErrors(untrack(name));
              validation.change(lastChangedValueRef.current ?? parsedValue);
            },
          }),
          {
            type: 'number',
            form: componentProps.form,
            name: name(),
            value: value() ?? '',
            // Port note: React also mirrors a controlled input's value into its `value`
            // attribute, which is the step base for `stepMismatch` when there's no `min`. Solid
            // only sets the property, so mirror it through `defaultValue`. The server already
            // renders `value` as the attribute.
            defaultValue: isServer ? undefined : (value() ?? ''),
            min: min(),
            max: max(),
            // stepMismatch validation is broken unless an explicit `min` is added.
            // See https://github.com/react/react/issues/12334.
            step: stepProp(),
            disabled: disabled(),
            readonly: readOnly(),
            required: required(),
            'aria-hidden': true,
            tabindex: -1,
            style: name() ? visuallyHiddenInput : visuallyHidden,
          },
        ],
      })}
    </NumberFieldRootContext>
  );
}

export interface NumberFieldRootProps extends Omit<
  BaseUIComponentProps<'div', NumberFieldRootState>,
  'onChange'
> {
  /**
   * The id of the input element.
   */
  id?: string | undefined;
  /**
   * The minimum value of the input element.
   */
  min?: number | undefined;
  /**
   * The maximum value of the input element.
   */
  max?: number | undefined;
  /**
   * When true, direct text entry may be outside the `min`/`max` range without clamping,
   * so native range underflow/overflow validation can occur.
   * Step-based interactions (keyboard arrows, buttons, wheel, scrub) still clamp.
   * @default false
   */
  allowOutOfRange?: boolean | undefined;
  /**
   * The small step value of the input element when incrementing while the alt key is held.
   * Snaps to multiples of this value when `snapOnStep` is enabled.
   * @default 0.1
   */
  smallStep?: number | undefined;
  /**
   * Amount to increment and decrement with the buttons and arrow keys, or to scrub with pointer movement in the scrub area.
   * To always enable step validation on form submission, specify the `min` prop explicitly in conjunction with this prop.
   * Specify `step="any"` to always disable step validation; interactive stepping then uses a base amount of `1`, while the alt and shift keys still step by `smallStep` and `largeStep`.
   * @default 1
   */
  step?: number | 'any' | undefined;
  /**
   * The large step value of the input element when incrementing while the shift key is held.
   * Snaps to multiples of this value when `snapOnStep` is enabled.
   * @default 10
   */
  largeStep?: number | undefined;
  /**
   * Whether the user must enter a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to change the field value.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the number field is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * The raw numeric value of the field.
   */
  value?: number | null | undefined;
  /**
   * The uncontrolled value of the field when it's initially rendered.
   *
   * To render a controlled number field, use the `value` prop instead.
   */
  defaultValue?: number | undefined;
  /**
   * Whether to allow the user to scrub the input value with the mouse wheel while focused and
   * hovering over the input.
   * @default false
   */
  allowWheelScrub?: boolean | undefined;
  /**
   * Whether the value should snap to the nearest step when incrementing or decrementing.
   * @default false
   */
  snapOnStep?: boolean | undefined;
  /**
   * Options to format the input value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * Callback fired when the number value changes.
   *
   * The `eventDetails.reason` indicates what triggered the change:
   * - `'input-change'` for parseable typing or programmatic text updates
   * - `'input-clear'` when the field becomes empty
   * - `'input-blur'` when formatting (and clamping, if enabled) occurs on blur
   * - `'input-paste'` for paste interactions
   * - `'keyboard'` for arrow-key/Home/End stepping (typing digits uses `'input-change'`/`'input-clear'`)
   * - `'increment-press'` / `'decrement-press'` for button presses on the increment and decrement controls
   * - `'wheel'` for wheel-based scrubbing
   * - `'scrub'` for scrub area drags
   */
  onValueChange?:
    ((value: number | null, eventDetails: NumberFieldRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Callback function that is fired when the value is committed.
   * It runs later than `onValueChange`, when:
   * - The input is blurred after typing a value.
   * - The pointer is released after scrubbing or pressing the increment/decrement buttons.
   *
   * It runs simultaneously with `onValueChange` when interacting with the keyboard or the
   * mouse wheel.
   *
   * **Warning**: This is a generic event not a change event.
   */
  onValueCommitted?:
    ((value: number | null, eventDetails: NumberFieldRoot.CommitEventDetails) => void) | undefined;
  /**
   * The locale of the input element.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: ((element: HTMLInputElement) => void) | undefined;
}

export interface NumberFieldRootState extends FieldRootState {
  /**
   * The raw numeric value of the field.
   */
  value: number | null;
  /**
   * The formatted string value presented in the input element.
   */
  inputValue: string;
  /**
   * Whether the user must enter a value before submitting a form.
   */
  required: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to change the field value.
   */
  readOnly: boolean;
  /**
   * Whether the user is currently scrubbing the field.
   */
  scrubbing: boolean;
}

export type NumberFieldRootChangeEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.inputClear
  | typeof REASONS.inputBlur
  | typeof REASONS.inputPaste
  | typeof REASONS.keyboard
  | typeof REASONS.incrementPress
  | typeof REASONS.decrementPress
  | typeof REASONS.wheel
  | typeof REASONS.scrub
  | typeof REASONS.none;
export type NumberFieldRootChangeEventDetails = BaseUIChangeEventDetails<
  NumberFieldRootChangeEventReason,
  ChangeEventCustomProperties
>;

// `none` is kept for consistency with other components even though the number field never
// commits with it.
export type NumberFieldRootCommitEventReason =
  | typeof REASONS.inputBlur
  | typeof REASONS.inputClear
  | typeof REASONS.keyboard
  | typeof REASONS.incrementPress
  | typeof REASONS.decrementPress
  | typeof REASONS.wheel
  | typeof REASONS.scrub
  | typeof REASONS.none;
export type NumberFieldRootCommitEventDetails =
  BaseUIGenericEventDetails<NumberFieldRoot.CommitEventReason>;

export namespace NumberFieldRoot {
  export type State = NumberFieldRootState;
  export type Props = NumberFieldRootProps;
  export type ChangeEventReason = NumberFieldRootChangeEventReason;
  export type ChangeEventDetails = NumberFieldRootChangeEventDetails;
  export type CommitEventReason = NumberFieldRootCommitEventReason;
  export type CommitEventDetails = NumberFieldRootCommitEventDetails;
}
