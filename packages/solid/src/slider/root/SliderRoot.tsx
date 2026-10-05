import { createEffect, createMemo, createSignal, flush, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { warn } from '@base-ui-solid/utils/warn';
import { clamp } from '@base-ui-solid/utils/clamp';
import { areArraysEqual } from '@base-ui-solid/utils/areArraysEqual';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { BaseUIComponentProps, Orientation } from '../../internals/types';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { useValueChanged } from '../../internals/useValueChanged';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';
import { activeElement, contains } from '../../floating-ui-solid/utils';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import type { CompositeMetadata } from '../../internals/composite/list/CompositeList';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { resolveAriaLabelledBy, getDefaultLabelId } from '../../utils/resolveAriaLabelledBy';
import { asc } from '../utils/asc';
import { getSliderValue } from '../utils/getSliderValue';
import { validateMinimumDistance } from '../utils/validateMinimumDistance';
import type { ThumbMetadata } from '../thumb/SliderThumb';
import { sliderStateAttributesMapping } from './stateAttributesMapping';
import { SliderRootContext } from './SliderRootContext';
import { REASONS } from '../../internals/reasons';

function areValuesEqual(
  newValue: number | readonly number[],
  oldValue: number | readonly number[],
) {
  return (
    newValue === oldValue ||
    (Array.isArray(newValue) && Array.isArray(oldValue) && areArraysEqual(newValue, oldValue))
  );
}

/**
 * Groups all parts of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui-solid.pages.dev/solid/components/slider)
 */
export function SliderRoot<Value extends number | readonly number[]>(
  componentProps: SliderRoot.Props<Value>,
): JSX.Element {
  const elementProps = omit(
    componentProps,
    'aria-labelledby',
    'class',
    'defaultValue',
    'disabled',
    'id',
    'format',
    'largeStep',
    'locale',
    'render',
    'max',
    'min',
    'minStepsBetweenValues',
    'form',
    'name',
    'onValueChange',
    'onValueCommitted',
    'orientation',
    'step',
    'thumbCollisionBehavior',
    'thumbAlignment',
    'value',
    'style',
  );

  const disabledProp = () => componentProps.disabled ?? false;
  const largeStep = () => componentProps.largeStep ?? 10;
  const max = () => componentProps.max ?? 100;
  const min = () => componentProps.min ?? 0;
  const minStepsBetweenValues = () => componentProps.minStepsBetweenValues ?? 0;
  const nameProp = () => componentProps.name;
  const orientation = () => componentProps.orientation ?? 'horizontal';
  const step = () => componentProps.step ?? 1;
  const thumbCollisionBehavior = () => componentProps.thumbCollisionBehavior ?? 'push';
  const thumbAlignment = () => componentProps.thumbAlignment ?? 'center';

  // Port note: upstream re-derives the id from `idProp` on every render (`useBaseUiId(idProp)`).
  const generatedId = useBaseUiId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;
  const defaultLabelId = () => getDefaultLabelId(id());
  const onValueChange = (value: number | number[], eventDetails: SliderRoot.ChangeEventDetails) =>
    (
      componentProps.onValueChange as
        | ((value: number | number[], eventDetails: SliderRoot.ChangeEventDetails) => void)
        | undefined
    )?.(value, eventDetails);
  const onValueCommitted = (
    value: number | readonly number[],
    eventDetails: SliderRoot.CommitEventDetails,
  ) =>
    (
      componentProps.onValueCommitted as
        | ((value: number | readonly number[], eventDetails: SliderRoot.CommitEventDetails) => void)
        | undefined
    )?.(value, eventDetails);

  const { clearErrors } = useFormContext();
  const {
    state: fieldState,
    disabled: fieldDisabled,
    name: fieldName,
    setTouched,
    setDirty,
    validityData,
    validation,
  } = useFieldRootContext();
  const { labelId: fieldLabelId } = useLabelableContext();
  const [labelId, setLabelId] = createSignal<string | undefined>();

  const ariaLabelledby = () =>
    (componentProps['aria-labelledby'] as string | undefined) ??
    resolveAriaLabelledBy(fieldLabelId(), labelId());
  const disabled = () => (fieldDisabled() ?? false) || disabledProp();
  const name = () => fieldName() ?? nameProp();

  // The internal value is potentially unsorted, e.g. to support frozen arrays
  // https://github.com/mui/material-ui/pull/28472
  const [valueUnwrapped, setValueUnwrapped] = useControlled<Value | number>({
    controlled: () => componentProps.value,
    get default() {
      return componentProps.defaultValue ?? min();
    },
    name: 'Slider',
  });

  let sliderElement: HTMLElement | null = null;
  const controlRef: RefObject<HTMLElement | null> = { current: null };
  const thumbRefs: RefObject<(HTMLElement | null)[]> = { current: [] };
  // The px distance between the pointer and the center of a pressed thumb.
  const pressedThumbCenterOffsetRef: RefObject<number | null> = { current: null };
  // The index of the pressed thumb, or the closest thumb if the `Control` was pressed.
  // This is updated on pointerdown, which is sooner than the `active/activeIndex`
  // state which is updated later when the nested `input` receives focus.
  const pressedThumbIndexRef: RefObject<number> = { current: -1 };
  // The values when the current drag interaction started.
  const pressedValuesRef: RefObject<readonly number[] | null> = { current: null };
  const lastChangeReasonRef: RefObject<SliderRoot.ChangeEventReason> = { current: REASONS.none };

  // We can't use the :active browser pseudo-classes.
  // - The active state isn't triggered when clicking on the rail.
  // - The active state isn't transferred when inversing a range slider.
  const [active, setActiveState] = createSignal(-1);
  const [lastUsedThumbIndex, setLastUsedThumbIndex] = createSignal(-1);
  const [dragging, setDragging] = createSignal(false);
  // Port note: written by `CompositeList`'s flush, which runs in an effect.
  const [thumbMap, setThumbMap] = createSignal(new Map<Node, CompositeMetadata<ThumbMetadata>>());
  const [indicatorPosition, setIndicatorPosition] = createSignal<(number | undefined)[]>([
    undefined,
    undefined,
  ]);

  const setActive = (value: number) => {
    setActiveState(value);

    if (value !== -1) {
      setLastUsedThumbIndex(value);
    }
  };

  const registerFieldControlRef = (element: Element | null) => {
    if (element) {
      controlRef.current = element as HTMLElement;
    }
  };

  const range = () => Array.isArray(valueUnwrapped());

  const values = createMemo<readonly number[]>(() => {
    const currentValue = valueUnwrapped();
    if (!Array.isArray(currentValue)) {
      return [clamp(currentValue as number, min(), max())];
    }
    return currentValue.map((value: number) => clamp(value, min(), max())).sort(asc);
  });

  const fieldValue = createMemo(() => (range() ? values() : values()[0]));

  useRegisterFieldControl(
    validation.inputRef,
    id,
    fieldValue,
    undefined,
    () => !disabled(),
    nameProp,
  );

  useValueChanged(fieldValue, () => {
    const currentFieldValue = untrack(fieldValue);
    clearErrors(untrack(name));

    validation.change(currentFieldValue);

    const initialValue = untrack(validityData).initialValue as
      number | readonly number[] | undefined;
    let isDirty: boolean;
    if (Array.isArray(currentFieldValue) && Array.isArray(initialValue)) {
      isDirty = !areArraysEqual(currentFieldValue, initialValue);
    } else {
      isDirty = currentFieldValue !== initialValue;
    }
    setDirty(isDirty);
  });

  const setValue = (newValue: number | number[], details: SliderRoot.ChangeEventDetails) => {
    if (Number.isNaN(newValue) || areValuesEqual(newValue, untrack(valueUnwrapped))) {
      return false;
    }

    // Redefine target to allow name and value to be read.
    // This allows seamless integration with the most popular form libraries.
    // https://github.com/mui/material-ui/issues/13485#issuecomment-676048492
    // Clone the event to not override `target` of the original event.
    const nativeEvent = details.event;
    const EventConstructor = nativeEvent.constructor as typeof Event;
    const clonedEvent = new EventConstructor(nativeEvent.type, nativeEvent);

    Object.defineProperty(clonedEvent, 'target', {
      writable: true,
      value: { value: newValue, name: untrack(name) },
    });

    details.event = clonedEvent;

    onValueChange(newValue, details);

    if (details.isCanceled) {
      return false;
    }

    lastChangeReasonRef.current = details.reason;

    setValueUnwrapped(newValue as Value);

    // Port note: React re-renders before the next event is dispatched. Solid batches the write
    // until the microtask flush, so apply it now: interactions (and synchronously dispatched
    // events in tests) read the current value back.
    flush();

    return true;
  };

  const handleInputChange = (valueInput: number, index: number, event: KeyboardEvent | Event) => {
    const newValue = getSliderValue(
      valueInput,
      index,
      untrack(min),
      untrack(max),
      untrack(range),
      untrack(values),
    );

    if (validateMinimumDistance(newValue, untrack(step), untrack(minStepsBetweenValues))) {
      const reason = 'key' in event ? REASONS.keyboard : REASONS.inputChange;
      const applied = setValue(
        newValue,
        createChangeEventDetails(reason, event as KeyboardEvent, undefined, {
          activeThumbIndex: index,
        }),
      );
      setTouched(true);

      if (applied) {
        onValueCommitted(newValue, createGenericEventDetails(reason, event as KeyboardEvent));
      }
    }
  };

  if (IS_DEV) {
    createEffect(
      () => min() >= max(),
      (invalidRange) => {
        if (invalidRange) {
          warn('Slider `max` must be greater than `min`.');
        }
      },
    );
  }

  useIsoLayoutEffect(
    ([currentActive, isDisabled]) => {
      if (!isDisabled) {
        return;
      }

      const activeEl = activeElement(ownerDocument(sliderElement));
      if (contains(sliderElement, activeEl)) {
        // This is necessary because Firefox and Safari will keep focus
        // on a disabled element:
        // https://codesandbox.io/p/sandbox/mui-pr-22247-forked-h151h?file=/src/App.js
        (activeEl as HTMLElement).blur();
      }

      if (currentActive !== -1) {
        setActive(-1);
      }
    },
    () => [active(), disabled()],
  );

  const state = createMemo<SliderRootState>(() => ({
    ...fieldState(),
    activeThumbIndex: active(),
    disabled: disabled(),
    dragging: dragging(),
    orientation: orientation(),
    max: max(),
    min: min(),
    minStepsBetweenValues: minStepsBetweenValues(),
    step: step(),
    values: values(),
  }));

  const contextValue: SliderRootContext = {
    active,
    controlRef,
    disabled,
    dragging,
    validation,
    format: () => componentProps.format,
    handleInputChange,
    indicatorPosition,
    inset: () => thumbAlignment() !== 'center',
    isArrayValue: range,
    labelId: ariaLabelledby,
    rootLabelId: defaultLabelId,
    largeStep,
    lastUsedThumbIndex,
    lastChangeReasonRef,
    form: () => componentProps.form,
    locale: () => componentProps.locale,
    max,
    min,
    minStepsBetweenValues,
    name,
    onValueCommitted,
    orientation,
    pressedThumbCenterOffsetRef,
    pressedThumbIndexRef,
    pressedValuesRef,
    registerFieldControlRef,
    renderBeforeHydration: () => thumbAlignment() === 'edge',
    setActive,
    setDragging,
    setIndicatorPosition,
    setLabelId,
    setValue,
    state,
    step,
    thumbCollisionBehavior,
    thumbMap,
    thumbRefs,
    values,
  };

  return (
    <SliderRootContext value={contextValue}>
      <CompositeList elementsRef={thumbRefs} onMapChange={setThumbMap}>
        {useRenderElement('div', componentProps, {
          state,
          ref: (element: HTMLElement | null) => {
            sliderElement = element;
          },
          props: () => [
            {
              'aria-labelledby': ariaLabelledby(),
              id: id(),
              role: 'group',
            },
            elementProps,
            (props: Record<string, any>) => validation.getValidationProps(disabled(), props),
          ],
          stateAttributesMapping: sliderStateAttributesMapping,
        })}
      </CompositeList>
    </SliderRootContext>
  );
}

export interface SliderRootState extends FieldRootState {
  /**
   * The index of the active thumb.
   */
  activeThumbIndex: number;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the thumb is currently being dragged.
   */
  dragging: boolean;
  /**
   * The maximum value.
   */
  max: number;
  /**
   * The minimum value.
   */
  min: number;
  /**
   * The minimum steps between values in a range slider.
   * @default 0
   */
  minStepsBetweenValues: number;
  /**
   * The component orientation.
   */
  orientation: Orientation;
  /**
   * The step increment of the slider when incrementing or decrementing. It will snap
   * to multiples of this value. Decimal values are supported.
   * @default 1
   */
  step: number;
  /**
   * The raw number value of the slider.
   */
  values: readonly number[];
}

export interface SliderRootProps<
  Value extends number | readonly number[] = number | readonly number[],
> extends BaseUIComponentProps<'div', SliderRootState> {
  /**
   * The uncontrolled value of the slider when it's initially rendered.
   *
   * To render a controlled slider, use the `value` prop instead.
   */
  defaultValue?: Value | undefined;
  /**
   * Whether the slider should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum allowed value of the slider.
   * Should not be equal to min.
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum allowed value of the slider.
   * Should not be equal to max.
   * @default 0
   */
  min?: number | undefined;
  /**
   * The minimum steps between values in a range slider.
   * @default 0
   */
  minStepsBetweenValues?: number | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the slider inputs.
   * Useful when the slider is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * The component orientation.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
  /**
   * The granularity with which the slider can step through values. (A "discrete" slider.)
   * The `min` prop serves as the origin for the valid values.
   * We recommend (max - min) to be evenly divisible by the step.
   * @default 1
   */
  step?: number | undefined;
  /**
   * The granularity with which the slider can step through values when using Page Up/Page Down or Shift + Arrow Up/Arrow Down.
   * @default 10
   */
  largeStep?: number | undefined;
  /**
   * How the thumb(s) are aligned relative to `Slider.Control` when the value is at `min` or `max`:
   * - `center`: The center of the thumb is aligned with the control edge
   * - `edge`: The thumb is inset within the control such that its edge is aligned with the control edge
   * - `edge-client-only`: Same as `edge` but renders after hydration on the client, reducing bundle size in return
   * @default 'center'
   */
  thumbAlignment?: 'center' | 'edge' | 'edge-client-only' | undefined;
  /**
   * Controls how thumbs behave when they collide during pointer interactions.
   *
   * - `'push'` (default): Thumbs push each other without restoring their previous positions when dragged back.
   * - `'swap'`: Thumbs swap places when dragged past each other.
   * - `'none'`: Thumbs cannot move past each other; excess movement is ignored.
   *
   * @default 'push'
   */
  thumbCollisionBehavior?: 'push' | 'swap' | 'none' | undefined;
  /**
   * The value of the slider.
   * For range sliders, provide an array with one value per thumb.
   */
  value?: Value | undefined;
  /**
   * Callback function that is fired when the slider's value changed.
   * Receives the new value as the first argument; the originating event is
   * available as `eventDetails.event`. The value is also reflected on
   * `eventDetails.event.target.value` for form integration.
   *
   * The `eventDetails.reason` indicates what triggered the change:
   *
   * - `'input-change'` when the hidden range input emits a change event (for example, via form integration)
   * - `'track-press'` when the control track is pressed
   * - `'drag'` while dragging a thumb
   * - `'keyboard'` for keyboard input
   * - `'none'` when the change is triggered without a specific interaction
   */
  onValueChange?:
    | ((
        value: Value extends number ? number : Value,
        eventDetails: SliderRoot.ChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Callback function that is fired when a value change is committed.
   * Does not fire if the value did not change, or if the change was canceled.
   * **Warning**: This is a generic event, not a change event.
   *
   * The `eventDetails.reason` indicates what triggered the commit:
   *
   * - `'drag'` while dragging a thumb
   * - `'track-press'` when the control track is pressed
   * - `'keyboard'` for keyboard input
   * - `'input-change'` when the hidden range input emits a change event (for example, via form integration)
   * - `'none'` when the commit occurs without a specific interaction
   */
  onValueCommitted?:
    | ((
        value: Value extends number ? number : Value,
        eventDetails: SliderRoot.CommitEventDetails,
      ) => void)
    | undefined;
}

export interface SliderRootChangeEventCustomProperties {
  /**
   * The index of the active thumb at the time of the change.
   */
  activeThumbIndex: number;
}

export type SliderRootChangeEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.trackPress
  | typeof REASONS.drag
  | typeof REASONS.keyboard
  | typeof REASONS.none;
export type SliderRootChangeEventDetails = BaseUIChangeEventDetails<
  SliderRoot.ChangeEventReason,
  SliderRootChangeEventCustomProperties
>;

export type SliderRootCommitEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.trackPress
  | typeof REASONS.drag
  | typeof REASONS.keyboard
  | typeof REASONS.none;
export type SliderRootCommitEventDetails = BaseUIGenericEventDetails<SliderRoot.CommitEventReason>;

export namespace SliderRoot {
  export type State = SliderRootState;
  export type Props<Value extends number | readonly number[] = number | readonly number[]> =
    SliderRootProps<Value>;
  export type ChangeEventReason = SliderRootChangeEventReason;
  export type ChangeEventDetails = SliderRootChangeEventDetails;
  export type CommitEventReason = SliderRootCommitEventReason;
  export type CommitEventDetails = SliderRootCommitEventDetails;
}
