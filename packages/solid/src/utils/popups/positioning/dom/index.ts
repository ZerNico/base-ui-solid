/**
 * Port note: Solid counterpart of `@floating-ui/react-dom`, built on `@floating-ui/dom`.
 * Upstream imports from `@floating-ui/react-dom` are replaced by imports from this module.
 * It exposes the same API: `useFloating`, the DOM utilities, and middleware that accept an
 * optional `deps` argument (compared deeply to detect option changes) plus an `arrow` that
 * accepts a ref object.
 */
import {
  arrow as arrowCore,
  autoPlacement as autoPlacementCore,
  flip as flipCore,
  hide as hideCore,
  inline as inlineCore,
  limitShift as limitShiftCore,
  offset as offsetCore,
  shift as shiftCore,
  size as sizeCore,
} from '@floating-ui/dom';
import type {
  AutoPlacementOptions,
  Derivable,
  FlipOptions,
  HideOptions,
  InlineOptions,
  LimitShiftOptions,
  Middleware,
  MiddlewareState,
  OffsetOptions,
  Padding,
  ShiftOptions,
  SizeOptions,
} from '@floating-ui/dom';
import type { RefObject } from '@base-ui-solid/utils/refObject';

export {
  autoUpdate,
  computePosition,
  detectOverflow,
  getOverflowAncestors,
  platform,
} from '@floating-ui/dom';
export { useFloating } from './useFloating';
export type * from './types';

type DependencyList = ReadonlyArray<unknown>;

export interface ArrowOptions {
  /**
   * The arrow element to be positioned.
   * @default undefined
   */
  element: RefObject<Element | null> | Element | null;
  /**
   * The padding between the arrow element and the floating element edges.
   * Useful when the floating element has rounded corners.
   * @default 0
   */
  padding?: Padding | undefined;
}

function isRef(value: unknown): value is RefObject<unknown> {
  return {}.hasOwnProperty.call(value, 'current');
}

/**
 * Provides data to position an inner element of the floating element so that it
 * appears centered to the reference element.
 * This wraps the core `arrow` middleware to allow refs as the element.
 * @see https://floating-ui.com/docs/arrow
 */
const arrowWithRefs = (options: ArrowOptions | Derivable<ArrowOptions>): Middleware => {
  return {
    name: 'arrow',
    options,
    fn(state: MiddlewareState) {
      const { element, padding } = typeof options === 'function' ? options(state) : options;

      if (element && isRef(element)) {
        if (element.current != null) {
          return arrowCore({ element: element.current, padding }).fn(state);
        }

        return {};
      }

      if (element) {
        return arrowCore({ element: element as Element, padding }).fn(state);
      }

      return {};
    },
  };
};

/**
 * Modifies the placement by translating the floating element along the
 * specified axes.
 * @see https://floating-ui.com/docs/offset
 */
export const offset = (options?: OffsetOptions, deps?: DependencyList): Middleware => ({
  ...offsetCore(options),
  options: [options, deps],
});

/**
 * Optimizes the visibility of the floating element by shifting it in order to
 * keep it in view when it will overflow the clipping boundary.
 * @see https://floating-ui.com/docs/shift
 */
export const shift = (
  options?: ShiftOptions | Derivable<ShiftOptions>,
  deps?: DependencyList,
): Middleware => ({
  ...shiftCore(options),
  options: [options, deps],
});

/**
 * Built-in `limiter` that will stop `shift()` at a certain point.
 */
export const limitShift = (
  options?: LimitShiftOptions | Derivable<LimitShiftOptions>,
  deps?: DependencyList,
): ReturnType<typeof limitShiftCore> => ({
  ...limitShiftCore(options),
  options: [options, deps],
});

/**
 * Optimizes the visibility of the floating element by flipping the `placement`
 * in order to keep it in view when the preferred placement(s) will overflow the
 * clipping boundary.
 * @see https://floating-ui.com/docs/flip
 */
export const flip = (
  options?: FlipOptions | Derivable<FlipOptions>,
  deps?: DependencyList,
): Middleware => ({
  ...flipCore(options),
  options: [options, deps],
});

/**
 * Provides data that allows you to change the size of the floating element.
 * @see https://floating-ui.com/docs/size
 */
export const size = (
  options?: SizeOptions | Derivable<SizeOptions>,
  deps?: DependencyList,
): Middleware => ({
  ...sizeCore(options),
  options: [options, deps],
});

/**
 * Optimizes the visibility of the floating element by choosing the placement
 * that has the most space available automatically.
 * @see https://floating-ui.com/docs/autoPlacement
 */
export const autoPlacement = (
  options?: AutoPlacementOptions | Derivable<AutoPlacementOptions>,
  deps?: DependencyList,
): Middleware => ({
  ...autoPlacementCore(options),
  options: [options, deps],
});

/**
 * Provides data to hide the floating element in applicable situations.
 * @see https://floating-ui.com/docs/hide
 */
export const hide = (
  options?: HideOptions | Derivable<HideOptions>,
  deps?: DependencyList,
): Middleware => ({
  ...hideCore(options),
  options: [options, deps],
});

/**
 * Provides improved positioning for inline reference elements that can span
 * over multiple lines.
 * @see https://floating-ui.com/docs/inline
 */
export const inline = (
  options?: InlineOptions | Derivable<InlineOptions>,
  deps?: DependencyList,
): Middleware => ({
  ...inlineCore(options),
  options: [options, deps],
});

/**
 * Provides data to position an inner element of the floating element so that it
 * appears centered to the reference element.
 * This wraps the core `arrow` middleware to allow refs as the element.
 * @see https://floating-ui.com/docs/arrow
 */
export const arrow = (
  options: ArrowOptions | Derivable<ArrowOptions>,
  deps?: DependencyList,
): Middleware => ({
  ...arrowWithRefs(options),
  options: [options, deps],
});
