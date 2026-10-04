import type { JSX } from '@solidjs/web';
import type {
  ComputePositionConfig,
  ComputePositionReturn,
  VirtualElement,
} from '@floating-ui/dom';
import type { RefObject } from '@base-ui-solid/utils/refObject';

export type {
  AlignedPlacement,
  Alignment,
  ArrowOptions as DOMArrowOptions,
  AutoPlacementOptions,
  AutoUpdateOptions,
  Axis,
  Boundary,
  ClientRectObject,
  ComputePositionConfig,
  ComputePositionReturn,
  Coords,
  Derivable,
  DetectOverflowOptions,
  Dimensions,
  ElementContext,
  ElementRects,
  Elements,
  FlipOptions,
  FloatingElement,
  HideOptions,
  InlineOptions,
  Length,
  LimitShiftOptions,
  Middleware,
  MiddlewareArguments,
  MiddlewareData,
  MiddlewareReturn,
  MiddlewareState,
  NodeScroll,
  OffsetOptions,
  Padding,
  Placement,
  Platform,
  Rect,
  ReferenceElement,
  RootBoundary,
  ShiftOptions,
  Side,
  SideObject,
  SizeOptions,
  Strategy,
  VirtualElement,
} from '@floating-ui/dom';

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type ReferenceType = Element | VirtualElement;

export type UseFloatingData = Prettify<
  ComputePositionReturn & {
    isPositioned: boolean;
  }
>;

/**
 * Port note: the returned object is reactive like Solid props. `x`, `y`, `strategy`,
 * `placement`, `middlewareData`, `isPositioned`, `floatingStyles` and `elements.*` are getters:
 * read them in a reactive scope, and don't destructure them. `update` and `refs` are stable.
 * `floatingStyles` is a Solid style object (kebab-case keys).
 */
export type UseFloatingReturn<RT extends ReferenceType = ReferenceType> = Prettify<
  UseFloatingData & {
    /**
     * Update the position of the floating element, re-rendering the component
     * if required.
     */
    update: () => void;
    /**
     * Pre-configured positioning styles to apply to the floating element.
     */
    floatingStyles: JSX.CSSProperties;
    /**
     * Object containing the reference and floating refs and reactive setters.
     */
    refs: {
      /**
       * A Solid ref to the reference element.
       */
      reference: RefObject<RT | null>;
      /**
       * A Solid ref to the floating element.
       */
      floating: RefObject<HTMLElement | null>;
      /**
       * A callback to set the reference element (reactive).
       */
      setReference: (node: RT | null) => void;
      /**
       * A callback to set the floating element (reactive).
       */
      setFloating: (node: HTMLElement | null) => void;
    };
    elements: {
      reference: RT | null;
      floating: HTMLElement | null;
    };
  }
>;

/**
 * Port note: read lazily like Solid props (`options.x`), so pass a props-like object with
 * getters for reactive options.
 */
export type UseFloatingOptions<RT extends ReferenceType = ReferenceType> = Prettify<
  Partial<ComputePositionConfig> & {
    /**
     * A callback invoked when both the reference and floating elements are
     * mounted, and cleaned up when either is unmounted. This is useful for
     * setting up event listeners (e.g. pass `autoUpdate`).
     */
    whileElementsMounted?:
      ((reference: RT, floating: HTMLElement, update: () => void) => () => void) | undefined;
    /**
     * Object containing the reference and floating elements.
     */
    elements?:
      | {
          reference?: RT | null | undefined;
          floating?: HTMLElement | null | undefined;
        }
      | undefined;
    /**
     * The `open` state of the floating element to synchronize with the
     * `isPositioned` value.
     * @default false
     */
    open?: boolean | undefined;
    /**
     * Whether to use `transform` for positioning instead of `top` and `left`
     * (layout) in the `floatingStyles` object.
     * @default true
     */
    transform?: boolean | undefined;
  }
>;
