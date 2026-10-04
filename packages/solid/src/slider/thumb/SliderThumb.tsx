import { createMemo, createSignal, flush, omit, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { visuallyHidden } from '@base-ui-solid/utils/visuallyHidden';
import { ownerWindow } from '@base-ui-solid/utils/owner';
import { clamp } from '@base-ui-solid/utils/clamp';
import { formatNumber } from '@base-ui-solid/utils/formatNumber';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { script as prehydrationScript } from '#prehydration/slider/thumb';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useIsHydrating } from '../../utils/useIsHydrating';
import { useRenderElement } from '../../internals/useRenderElement';
import { valueToPercent } from '../../utils/valueToPercent';
import {
  ARROW_DOWN,
  ARROW_UP,
  ARROW_RIGHT,
  ARROW_LEFT,
  HOME,
  END,
  COMPOSITE_KEYS,
  PAGE_UP,
  PAGE_DOWN,
} from '../../internals/composite/composite';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { PrehydrationScript } from '../../internals/PrehydrationScript';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { contains } from '../../floating-ui-react/utils';
import { matchesFocusVisible } from '../../floating-ui-react/utils/element';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { getMidpoint } from '../utils/getMidpoint';
import { getSliderValue } from '../utils/getSliderValue';
import { getDecimalPrecision, roundValueToStep } from '../utils/roundValueToStep';
import type { SliderRootState } from '../root/SliderRoot';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import * as SliderThumbDataAttributes from './SliderThumbDataAttributes';

const ALL_KEYS = new Set([...COMPOSITE_KEYS, PAGE_UP, PAGE_DOWN]);

function getDefaultAriaValueText(
  values: readonly number[],
  index: number,
  format: Intl.NumberFormatOptions | undefined,
  locale: Intl.LocalesArgument | undefined,
): string | undefined {
  if (index < 0) {
    return undefined;
  }

  if (values.length === 2) {
    return `${formatNumber(values[index], locale, format)} ${index === 0 ? 'start' : 'end'} range`;
  }

  return format ? formatNumber(values[index], locale, format) : undefined;
}

function getNewValue(
  thumbValue: number,
  increment: number,
  direction: number,
  min: number,
  max: number,
): number {
  const value = thumbValue + increment * direction;
  const roundedValue = Number(
    value.toFixed(
      Math.max(
        getDecimalPrecision(thumbValue),
        getDecimalPrecision(increment),
        getDecimalPrecision(min),
      ),
    ),
  );
  return clamp(roundedValue, min, max);
}

/**
 * Calls a Solid event handler, including the bound `[handler, data]` form.
 */
function callEventHandler<E extends Event>(
  handler: JSX.EventHandlerUnion<HTMLInputElement, E> | undefined,
  event: E,
) {
  if (typeof handler === 'function') {
    (handler as (event: E) => void)(event);
  } else if (Array.isArray(handler)) {
    (handler[0] as (data: unknown, event: E) => void)(handler[1], event);
  }
}

/**
 * The draggable part of the slider at the tip of the indicator.
 * Renders a `<div>` element and a nested `<input type="range">`.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderThumb(componentProps: SliderThumb.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'children',
    'class',
    'aria-describedby',
    'aria-label',
    'aria-labelledby',
    'aria-valuetext',
    'disabled',
    'getAriaLabel',
    'getAriaValueText',
    'id',
    'index',
    'inputRef',
    'onBlur',
    'onFocus',
    'onKeyDown',
    'tabindex',
    'style',
  );

  const generatedId = useBaseUiId();
  const id = () => componentProps.id ?? generatedId;

  const {
    active: activeIndex,
    lastUsedThumbIndex,
    controlRef,
    disabled: contextDisabled,
    validation,
    format,
    handleInputChange,
    inset,
    isArrayValue,
    labelId,
    largeStep,
    locale,
    max,
    min,
    minStepsBetweenValues,
    form,
    name,
    orientation,
    pressedThumbCenterOffsetRef,
    pressedThumbIndexRef,
    renderBeforeHydration,
    setActive,
    setIndicatorPosition,
    state,
    step,
    thumbRefs,
    values: sliderValues,
  } = useSliderRootContext();

  const direction = useDirection();

  const disabled = () => (componentProps.disabled ?? false) || contextDisabled();
  const range = () => sliderValues().length > 1;
  const vertical = () => orientation() === 'vertical';
  const rtl = () => direction() === 'rtl';

  const { setTouched, validationMode } = useFieldRootContext();

  let thumbElement: HTMLElement | null = null;
  let inputElement: HTMLInputElement | null = null;
  const setFocused = useSetFieldFocused(disabled, () => inputElement);
  let restoringFocusVisible = false;

  // Attached to the `input` (not the thumb wrapper) so `event.currentTarget` is the
  // input, matching `onKeyDown`. The synthetic blur/focus dispatched while restoring
  // `:focus-visible` is internal and must not be forwarded to the user's handlers.
  const handleFocusProp = (event: FocusEvent) => {
    if (restoringFocusVisible) {
      return;
    }
    callEventHandler(componentProps.onFocus, event);
  };

  const handleBlurProp = (event: FocusEvent) => {
    if (restoringFocusVisible) {
      return;
    }
    callEventHandler(componentProps.onBlur, event);
  };

  const defaultInputId = useBaseUiId();
  const labelableId = useLabelableId();
  const inputId = () => (range() ? defaultInputId : labelableId());

  const thumbMetadata = createMemo(() => ({
    inputId: inputId(),
  }));

  const { ref: listItemRef, index: compositeIndex } = useCompositeListItem<ThumbMetadata>({
    metadata: thumbMetadata,
  });

  const index = () => (!range() ? 0 : (componentProps.index ?? compositeIndex()));
  const last = () => index() === sliderValues().length - 1;
  const thumbValue = () => sliderValues()[index()];
  const thumbValuePercent = () => valueToPercent(thumbValue(), min(), max());

  const [positionPercent, setPositionPercent] = createSignal<number | undefined>();
  const isHydrating = useIsHydrating();

  const safeLastUsedThumbIndex = () => {
    const currentLastUsedThumbIndex = lastUsedThumbIndex();
    return currentLastUsedThumbIndex >= 0 && currentLastUsedThumbIndex < sliderValues().length
      ? currentLastUsedThumbIndex
      : -1;
  };

  const getInsetPosition = () => {
    const control = controlRef.current;
    const thumb = thumbElement;
    if (!control || !thumb) {
      return;
    }

    const thumbRect = thumb.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();

    const side = untrack(vertical) ? 'height' : 'width';
    // the total travel distance adjusted to account for the thumb size
    const controlSize = controlRect[side] - thumbRect[side];
    // px distance from the starting edge (inline-start or bottom) to the thumb center
    const thumbOffsetFromControlEdge =
      thumbRect[side] / 2 + (controlSize * untrack(thumbValuePercent)) / 100;
    const nextPositionPercent = (thumbOffsetFromControlEdge / controlRect[side]) * 100;
    const nextInsetPosition = Number.isFinite(nextPositionPercent)
      ? nextPositionPercent
      : undefined;

    setPositionPercent(nextInsetPosition);

    if (untrack(index) === 0) {
      setIndicatorPosition((prevPosition) => [nextInsetPosition, prevPosition[1]]);
    } else if (untrack(last)) {
      setIndicatorPosition((prevPosition) => [prevPosition[0], nextInsetPosition]);
    }
  };

  useIsoLayoutEffect(
    ([isInset]) => {
      if (isInset) {
        queueMicrotask(getInsetPosition);
      }
    },
    () => [inset()],
  );

  useIsoLayoutEffect(
    ([isInset]) => {
      if (isInset) {
        getInsetPosition();
      }
    },
    () => [inset(), thumbValuePercent()],
  );

  useIsoLayoutEffect(
    ([isInset]) => {
      if (!isInset) {
        return undefined;
      }

      const control = controlRef.current;
      const thumb = thumbElement;

      if (!control || !thumb) {
        return undefined;
      }

      const ResizeObserverCtor = ownerWindow(control).ResizeObserver;
      if (typeof ResizeObserverCtor !== 'function') {
        return undefined;
      }

      const resizeObserver = new ResizeObserverCtor(getInsetPosition);

      resizeObserver.observe(control);
      resizeObserver.observe(thumb);

      return () => {
        resizeObserver.disconnect();
      };
    },
    () => [inset()],
  );

  // Port note: Solid style objects use kebab-case property names.
  const thumbStyle = (): JSX.CSSProperties => {
    const isInset = inset();
    const percent = thumbValuePercent();
    const isVertical = vertical();
    const currentIndex = index();
    const currentActiveIndex = activeIndex();

    if (!isInset && !Number.isFinite(percent)) {
      return visuallyHidden;
    }

    const startEdge = isVertical ? 'bottom' : 'inset-inline-start';
    const crossOffsetProperty = isVertical ? 'left' : 'top';

    let zIndex: number | undefined;
    if (range()) {
      if (currentActiveIndex === currentIndex) {
        zIndex = 2;
      } else if (safeLastUsedThumbIndex() === currentIndex) {
        zIndex = 1;
      }
    } else if (currentActiveIndex === currentIndex) {
      zIndex = 1;
    }

    const currentPositionPercent = positionPercent();

    return {
      position: 'absolute',
      [startEdge]: isInset ? 'var(--position)' : `${percent}%`,
      [crossOffsetProperty]: '50%',
      translate: `${(isVertical || !rtl() ? -1 : 1) * 50}% ${(isVertical ? 1 : -1) * 50}%`,
      'z-index': zIndex,
      ...(isInset && {
        '--position': `${currentPositionPercent ?? 0}%`,
        visibility:
          (renderBeforeHydration() && isHydrating()) || currentPositionPercent === undefined
            ? 'hidden'
            : undefined,
      }),
    } as JSX.CSSProperties;
  };

  const cssWritingMode = () => {
    if (vertical()) {
      return rtl() ? 'vertical-rl' : 'vertical-lr';
    }
    return undefined;
  };

  const ariaLabel = () => {
    const getAriaLabelProp = componentProps.getAriaLabel;
    return typeof getAriaLabelProp === 'function'
      ? getAriaLabelProp(index())
      : componentProps['aria-label'];
  };

  const inputProps = () => [
    {
      'aria-label': ariaLabel(),
      'aria-labelledby':
        componentProps['aria-labelledby'] ?? (ariaLabel() == null ? labelId() : undefined),
      'aria-describedby': componentProps['aria-describedby'],
      'aria-orientation': orientation(),
      'aria-valuenow': thumbValue(),
      'aria-valuetext':
        typeof componentProps.getAriaValueText === 'function'
          ? componentProps.getAriaValueText(
              formatNumber(thumbValue(), locale(), format()),
              thumbValue(),
              index(),
            )
          : (componentProps['aria-valuetext'] ??
            getDefaultAriaValueText(sliderValues(), index(), format(), locale())),
      disabled: disabled(),
      form: form(),
      id: inputId(),
      max: max(),
      min: min(),
      name: name(),
      // Port note: React's `onChange` fires on the range input's `input` events.
      onInput(event: InputEvent) {
        const input = event.currentTarget as HTMLInputElement;
        handleInputChange(input.valueAsNumber, untrack(index), event);

        // Port note: React restores a controlled input's value when the change isn't applied.
        // Solid doesn't, so restore it once the update has been applied.
        flush();
        const currentValue = untrack(thumbValue);
        if (input.value !== String(currentValue ?? '')) {
          input.value = String(currentValue ?? '');
        }
      },
      // Port note: `focusin`/`focusout` (React's `onFocus`/`onBlur` bubble), so that stopping
      // the internal focus events while restoring `:focus-visible` hides them from ancestors.
      onFocusIn(event: FocusEvent) {
        const isRestoringFocusVisible = restoringFocusVisible;
        restoringFocusVisible = false;
        setActive(untrack(index));
        setFocused(true);

        if (isRestoringFocusVisible) {
          event.stopPropagation();
        }
      },
      onFocusOut(event: FocusEvent) {
        if (restoringFocusVisible) {
          event.stopPropagation();
          return;
        }

        setActive(-1);

        // Keep field-level blur logic from running while focus moves to another thumb
        // of the same slider, so validation doesn't commit mid-interaction.
        if (
          thumbRefs.current.some((thumb) => contains(thumb, event.relatedTarget as Element | null))
        ) {
          return;
        }

        setTouched(true);
        setFocused(false);

        if (untrack(validationMode) === 'onBlur') {
          validation.commit(
            getSliderValue(
              untrack(thumbValue),
              untrack(index),
              untrack(min),
              untrack(max),
              untrack(isArrayValue),
              untrack(sliderValues),
            ),
          );
        }
      },
      onKeyDown(event: KeyboardEvent) {
        if (event.defaultPrevented) {
          return;
        }

        if (!ALL_KEYS.has(event.key)) {
          return;
        }

        if (COMPOSITE_KEYS.has(event.key)) {
          event.stopPropagation();
        }

        const currentIndex = untrack(index);
        const currentValues = untrack(sliderValues);
        const currentStep = untrack(step);
        const currentLargeStep = untrack(largeStep);
        const currentMin = untrack(min);
        const currentMax = untrack(max);
        const isRtl = untrack(rtl);
        const isRange = untrack(range);
        const currentMinStepsBetweenValues = untrack(minStepsBetweenValues);

        let newValue = null;
        let keyDirection = 0;
        let increment = event.shiftKey ? currentLargeStep : currentStep;
        const roundedValue = roundValueToStep(currentValues[currentIndex], currentStep, currentMin);
        switch (event.key) {
          case ARROW_UP:
            keyDirection = 1;
            break;
          case ARROW_RIGHT:
            keyDirection = isRtl ? -1 : 1;
            break;
          case ARROW_DOWN:
            keyDirection = -1;
            break;
          case ARROW_LEFT:
            keyDirection = isRtl ? 1 : -1;
            break;
          case PAGE_UP:
            increment = currentLargeStep;
            keyDirection = 1;
            break;
          case PAGE_DOWN:
            increment = currentLargeStep;
            keyDirection = -1;
            break;
          case END:
            newValue =
              isRange && Number.isFinite(currentValues[currentIndex + 1])
                ? currentValues[currentIndex + 1] - currentStep * currentMinStepsBetweenValues
                : currentMax;
            break;
          case HOME:
            newValue =
              isRange && Number.isFinite(currentValues[currentIndex - 1])
                ? currentValues[currentIndex - 1] + currentStep * currentMinStepsBetweenValues
                : currentMin;
            break;
          default:
            break;
        }

        if (keyDirection !== 0) {
          newValue = getNewValue(roundedValue, increment, keyDirection, currentMin, currentMax);
        }

        if (newValue !== null) {
          const input = event.currentTarget as HTMLInputElement;

          if (!matchesFocusVisible(input)) {
            restoringFocusVisible = true;
            input.blur();
            input.focus({
              preventScroll: true,
              // Show `:focus-visible` after keyboard interaction, even if the
              // thumb was previously focused by a pointer.
              focusVisible: true,
            } as FocusOptions);
          }

          handleInputChange(newValue, currentIndex, event);
          event.preventDefault();
        }
      },
      step: step(),
      style: {
        ...visuallyHidden,
        // So that VoiceOver's focus indicator matches the thumb's dimensions
        width: '100%',
        height: '100%',
        'writing-mode': cssWritingMode(),
      },
      tabindex: componentProps.tabindex,
      type: 'range',
      value: thumbValue() ?? '',
    },
    (props: Record<string, any>) => validation.getValidationProps(disabled(), props),
    { onFocus: handleFocusProp, onBlur: handleBlurProp, onKeyDown: componentProps.onKeyDown },
  ];

  // Port note: upstream merges the refs with `useMergedRefs`.
  const inputRefCallback = (element: HTMLInputElement | null) => {
    inputElement = element;
    validation.inputRef.current = element;
    const inputRefProp = untrack(() => componentProps.inputRef);
    if (element && typeof inputRefProp === 'function') {
      inputRefProp(element);
    }
  };

  const thumbChildren = {
    children: (
      <>
        {componentProps.children}
        {useRenderElement('input', EMPTY_OBJECT, {
          ref: inputRefCallback,
          props: inputProps,
        })}
        {/* Rendered with the last thumb to ensure all preceding thumbs are already in the DOM. */}
        <Show when={inset() && last() && renderBeforeHydration()}>
          <PrehydrationScript script={prehydrationScript} />
        </Show>
      </>
    ),
  };

  return useRenderElement('div', componentProps, {
    state,
    ref: [
      listItemRef,
      (element: HTMLElement | null) => {
        thumbElement = element;
      },
    ],
    props: () => [
      thumbChildren,
      {
        [SliderThumbDataAttributes.index]: index(),
        id: id(),
        onPointerDown(event: PointerEvent) {
          // Keep disabled thumbs from writing transient pointer state.
          if (untrack(disabled)) {
            return;
          }

          const isVertical = untrack(vertical);
          pressedThumbIndexRef.current = untrack(index);
          const midpoint = getMidpoint(event.currentTarget as HTMLElement, isVertical);
          pressedThumbCenterOffsetRef.current =
            (isVertical ? event.clientY : event.clientX) - midpoint;
        },
        // Port note: Solid has no `suppressHydrationWarning`.
        style: thumbStyle(),
      },
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });
}

export interface ThumbMetadata {
  inputId: string | undefined;
}

export interface SliderThumbState extends SliderRootState {}

export interface SliderThumbProps extends Omit<
  BaseUIComponentProps<'div', SliderThumbState>,
  'onBlur' | 'onFocus' | 'onKeyDown' | 'tabindex'
> {
  /**
   * Whether the thumb should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A string value forwarded to the [`aria-valuetext`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-valuetext) attribute of the `input`.
   * Ignored when `getAriaValueText` is provided.
   */
  'aria-valuetext'?: string | undefined;
  /**
   * A function which returns a string value for the [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) attribute of the `input`.
   */
  getAriaLabel?: ((index: number) => string) | null | undefined;
  /**
   * A function which returns a string value for the [`aria-valuetext`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-valuetext) attribute of the `input`.
   * This is important for screen reader users.
   */
  getAriaValueText?:
    ((formattedValue: string, value: number, index: number) => string) | null | undefined;
  /**
   * The index of the thumb which corresponds to the index of its value in the
   * `value` or `defaultValue` array.
   * This prop is required to support server-side rendering for range sliders
   * with multiple thumbs.
   * @example
   * ```tsx
   * <Slider.Root value={[10, 20]}>
   *   <Slider.Thumb index={0} />
   *   <Slider.Thumb index={1} />
   * </Slider.Root>
   * ```
   */
  index?: number | undefined;
  /**
   * A ref to access the nested input element.
   */
  inputRef?: ((element: HTMLInputElement) => void) | undefined;
  /**
   * A blur handler forwarded to the `input`.
   */
  onBlur?: JSX.EventHandlerUnion<HTMLInputElement, FocusEvent> | undefined;
  /**
   * A focus handler forwarded to the `input`.
   */
  onFocus?: JSX.EventHandlerUnion<HTMLInputElement, FocusEvent> | undefined;
  /**
   * A keydown handler forwarded to the `input`.
   */
  onKeyDown?: JSX.EventHandlerUnion<HTMLInputElement, KeyboardEvent> | undefined;
  /**
   * Optional tab index attribute forwarded to the `input`.
   */
  tabindex?: number | undefined;
}

export namespace SliderThumb {
  export type State = SliderThumbState;
  export type Props = SliderThumbProps;
}
