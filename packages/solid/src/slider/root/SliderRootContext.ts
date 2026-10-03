import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { Orientation } from '../../internals/types';
import type { CompositeMetadata } from '../../internals/composite/list/CompositeList';
import type { UseFieldValidationReturnValue } from '../../field/root/useFieldValidation';
import type { ThumbMetadata } from '../thumb/SliderThumb';
import type { SliderRoot, SliderRootState } from './SliderRoot';

type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Port note: reactive values are accessors, refs and callbacks stay plain.
 */
export interface SliderRootContext {
  /**
   * The index of the active thumb.
   */
  active: Accessor<number>;
  /**
   * The index of the most recently interacted thumb.
   */
  lastUsedThumbIndex: Accessor<number>;
  controlRef: RefObject<HTMLElement | null>;
  dragging: Accessor<boolean>;
  disabled: Accessor<boolean>;
  validation: UseFieldValidationReturnValue;
  /**
   * Options to format the value.
   */
  format: Accessor<Intl.NumberFormatOptions | undefined>;
  handleInputChange: (valueInput: number, index: number, event: KeyboardEvent | Event) => void;
  indicatorPosition: Accessor<(number | undefined)[]>;
  inset: Accessor<boolean>;
  /**
   * Whether the slider value is an array, including single-thumb arrays.
   */
  isArrayValue: Accessor<boolean>;
  labelId: Accessor<string | undefined>;
  rootLabelId: Accessor<string | undefined>;
  /**
   * The large step value of the slider when incrementing or decrementing while the shift key is held,
   * or when using Page-Up or Page-Down keys. Snaps to multiples of this value.
   * @default 10
   */
  largeStep: Accessor<number>;
  lastChangeReasonRef: RefObject<SliderRoot.ChangeEventReason>;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale: Accessor<Intl.LocalesArgument | undefined>;
  /**
   * The maximum allowed value of the slider.
   */
  max: Accessor<number>;
  /**
   * The minimum allowed value of the slider.
   */
  min: Accessor<number>;
  /**
   * The minimum steps between values in a range slider.
   */
  minStepsBetweenValues: Accessor<number>;
  form: Accessor<string | undefined>;
  name: Accessor<string | undefined>;
  /**
   * Function to be called when drag ends and the pointer is released.
   */
  onValueCommitted: (
    newValue: number | readonly number[],
    data: SliderRoot.CommitEventDetails,
  ) => void;
  /**
   * The component orientation.
   * @default 'horizontal'
   */
  orientation: Accessor<Orientation>;
  pressedThumbCenterOffsetRef: RefObject<number | null>;
  pressedThumbIndexRef: RefObject<number>;
  pressedValuesRef: RefObject<readonly number[] | null>;
  renderBeforeHydration: Accessor<boolean>;
  registerFieldControlRef: ((element: Element | null) => void) | null;
  setActive: (index: number) => void;
  setDragging: StateSetter<boolean>;
  setIndicatorPosition: StateSetter<(number | undefined)[]>;
  setLabelId: StateSetter<string | undefined>;
  /**
   * Applies a new value through `onValueChange` for keyboard, input, track-press,
   * and drag interactions. Returns `true` when the value was applied, or `false`
   * when it was invalid (NaN), unchanged, or the change was canceled.
   */
  setValue: (newValue: number | number[], details: SliderRoot.ChangeEventDetails) => boolean;
  state: Accessor<SliderRootState>;
  /**
   * The step increment of the slider when incrementing or decrementing. It will snap
   * to multiples of this value. Decimal values are supported.
   * @default 1
   */
  step: Accessor<number>;
  thumbCollisionBehavior: Accessor<'push' | 'swap' | 'none'>;
  thumbMap: Accessor<Map<Node, CompositeMetadata<ThumbMetadata>>>;
  thumbRefs: RefObject<(HTMLElement | null)[]>;
  /**
   * The value(s) of the slider
   */
  values: Accessor<readonly number[]>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const SliderRootContext = createContext<SliderRootContext | null>(null);

export function useSliderRootContext() {
  const context = useContext(SliderRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: SliderRootContext is missing. Slider parts must be placed within <Slider.Root>.',
    );
  }
  return context;
}
