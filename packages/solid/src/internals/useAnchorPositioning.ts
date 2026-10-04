import { createMemo, createSignal, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { getSide, getAlignment, getSideAxis } from '@floating-ui/utils';
import type { Rect } from '@floating-ui/utils';
import { ownerDocument, ownerWindow } from '@base-ui-solid/utils/owner';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import {
  autoUpdate,
  flip,
  limitShift,
  offset,
  shift as floatingShift,
  size,
} from '../floating-ui-react';
import type {
  UseFloatingOptions,
  UseFloatingReturn,
  Placement,
  FloatingRootContext,
  VirtualElement,
  Padding,
  FloatingContext,
  Side as PhysicalSide,
  MiddlewareState,
  AutoUpdateOptions,
  Middleware,
  FloatingTreeStore,
} from '../floating-ui-react';
import { useBaseUIFloating } from '../floating-ui-react/hooks/useFloating';
import { useDirection } from './direction-context/DirectionContext';
import { arrow } from '../floating-ui-react/middleware/arrow';
import { hide } from '../utils/hideMiddleware';
import { DEFAULT_SIDES } from '../utils/adaptiveOriginConstants';
import * as CommonPositionerCssVars from '../utils/CommonPositionerCssVars';

const AVAILABLE_WIDTH_VAR = CommonPositionerCssVars.availableWidth;
const AVAILABLE_HEIGHT_VAR = CommonPositionerCssVars.availableHeight;
// Port note: the dependency that stands for upstream's stable `anchor` function callback.
const STABLE_ANCHOR_FN_DEP = {};

function getLogicalSide(sideParam: Side, renderedSide: PhysicalSide, isRtl: boolean): Side {
  const isLogicalSideParam = sideParam === 'inline-start' || sideParam === 'inline-end';
  const logicalRight = isRtl ? 'inline-start' : 'inline-end';
  const logicalLeft = isRtl ? 'inline-end' : 'inline-start';
  return (
    {
      top: 'top',
      right: isLogicalSideParam ? logicalRight : 'right',
      bottom: 'bottom',
      left: isLogicalSideParam ? logicalLeft : 'left',
    } satisfies Record<PhysicalSide, Side>
  )[renderedSide];
}

function getOffsetData(state: MiddlewareState, sideParam: Side, isRtl: boolean) {
  const { rects, placement } = state;
  const data = {
    side: getLogicalSide(sideParam, getSide(placement), isRtl),
    align: getAlignment(placement) || 'center',
    anchor: { width: rects.reference.width, height: rects.reference.height },
    positioner: { width: rects.floating.width, height: rects.floating.height },
  } as const;
  return data;
}

export type Side = 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';
export type Align = 'start' | 'center' | 'end';
export type Boundary = 'clipping-ancestors' | Element | Element[] | Rect;
export type OffsetFunction = (data: {
  side: Side;
  align: Align;
  anchor: { width: number; height: number };
  positioner: { width: number; height: number };
}) => number;

interface SideFlipMode {
  /**
   * How to avoid collisions on the side axis.
   * - `'flip'`: If there is not enough space, place the popup on the opposite side.
   * - `'none'`: Keep the preferred side even if it overflows.
   */
  side?: 'flip' | 'none' | undefined;
  /**
   * How to avoid collisions on the align axis.
   * - `'flip'`: If there is not enough space, swap `'start'` and `'end'` alignment.
   * - `'shift'`: Keep the alignment and shift the popup to fit within the boundary.
   * - `'none'`: Keep the preferred alignment even if it overflows.
   */
  align?: 'flip' | 'shift' | 'none' | undefined;
  /**
   * If both sides on the preferred axis do not fit, determines whether to fallback
   * to a side on the perpendicular axis and which logical side to prefer.
   * - `'start'`: Prefer the logical start side on the perpendicular axis.
   * - `'end'`: Prefer the logical end side on the perpendicular axis.
   * - `'none'`: Do not fallback to the perpendicular axis.
   */
  fallbackAxisSide?: 'start' | 'end' | 'none' | undefined;
}

interface SideShiftMode {
  /**
   * How to avoid collisions on the side axis.
   * - `'shift'`: Keep the preferred side and shift the popup to fit within the boundary.
   * - `'none'`: Keep the preferred side even if it overflows.
   */
  side?: 'shift' | 'none' | undefined;
  /**
   * How to avoid collisions on the align axis.
   * - `'shift'`: Keep the alignment and shift the popup to fit within the boundary.
   * - `'none'`: Keep the preferred alignment even if it overflows.
   */
  align?: 'shift' | 'none' | undefined;
  /**
   * If both sides on the preferred axis do not fit, determines whether to fallback
   * to a side on the perpendicular axis and which logical side to prefer.
   * - `'start'`: Prefer the logical start side on the perpendicular axis.
   * - `'end'`: Prefer the logical end side on the perpendicular axis.
   * - `'none'`: Do not fallback to the perpendicular axis.
   */
  fallbackAxisSide?: 'start' | 'end' | 'none' | undefined;
}

export type CollisionAvoidance = SideFlipMode | SideShiftMode;

type UseFloatingHook = (options: UseFloatingOptions) => UseFloatingReturn;

/**
 * Provides standardized anchor positioning behavior for floating elements. Wraps Floating UI's
 * `useFloating` hook.
 *
 * Port note: `params` is read lazily like Solid props (pass an object with getters for reactive
 * values); `floatingRootContext`, `nodeId` and `externalTree` are read once by `useFloatingHook`.
 * The returned object keeps upstream's shape, but its reactive values (`positionerStyles`,
 * `arrowStyles`, `arrowUncentered`, `side`, `align`, `physicalSide`, `anchorHidden` and
 * `isPositioned`) are getters, like `useFloating`'s return value: read them in a reactive scope and
 * don't destructure them. `arrowRef`, `refs`, `context` and `update` are stable.
 */
export function useAnchorPositioning(
  params: UseAnchorPositioningParameters & { floatingRootContext: FloatingRootContext },
): UseAnchorPositioningReturnValue {
  return useAnchorPositioningWithHook(params, useBaseUIFloating as UseFloatingHook);
}

export function useAnchorPositioningWithHook(
  params: UseAnchorPositioningParameters,
  useFloatingHook: UseFloatingHook,
): UseAnchorPositioningReturnValue {
  // Public parameters
  const anchor = () => params.anchor;
  const positionMethod = () => params.positionMethod ?? 'absolute';
  const sideParam = () => params.side ?? 'bottom';
  const sideOffset = () => params.sideOffset ?? 0;
  const align = () => params.align ?? 'center';
  const alignOffset = () => params.alignOffset ?? 0;
  const collisionBoundary = () => params.collisionBoundary;
  const collisionPaddingParam = () => params.collisionPadding ?? 5;
  const sticky = () => params.sticky ?? false;
  const arrowPadding = () => params.arrowPadding ?? 5;
  const disableAnchorTracking = () => params.disableAnchorTracking ?? false;
  const inlineMiddleware = () => params.inline;
  // Private parameters
  const keepMounted = () => params.keepMounted ?? false;
  const floatingRootContext = () => params.floatingRootContext;
  const mounted = () => params.mounted;
  const collisionAvoidance = () => params.collisionAvoidance;
  const shift = () => params.shift;
  const adaptiveOrigin = () => params.adaptiveOrigin;
  const lazyFlip = () => params.lazyFlip ?? false;

  const collisionAvoidanceSide = () => collisionAvoidance().side || 'flip';
  const collisionAvoidanceAlign = () => collisionAvoidance().align || 'flip';
  const collisionAvoidanceFallbackAxisSide = () => collisionAvoidance().fallbackAxisSide || 'end';
  const shiftCrossAxis = () => shift()?.crossAxis ?? false;
  const shiftRootBoundary = () => shift()?.rootBoundary;

  // Port note: upstream passes a stable callback as the dependency when `anchor` is a function, so
  // only a change of a non-function anchor re-runs the anchor effects.
  const anchorDep = () => {
    const anchorValue = anchor();
    return typeof anchorValue === 'function' ? STABLE_ANCHOR_FN_DEP : anchorValue;
  };

  const direction = useDirection();
  const isRtl = () => direction() === 'rtl';

  // Port note: upstream resets `mountPlacement` during render when unmounted. A writable memo
  // applies the same rule whenever `mounted` changes.
  const [mountPlacement, setMountPlacement] = createSignal<Placement | null>(
    (prev) => (mounted() ? (prev ?? null) : null),
    { ownedWrite: true },
  );

  const lockAlign = () => lazyFlip() === 'placement';
  const mountSide = () => {
    const value = mountPlacement();
    return value ? getSide(value) : null;
  };
  const mountAlign = () => {
    const value = mountPlacement();
    return value && lockAlign() ? getAlignment(value) || 'center' : null;
  };
  const side = createMemo<PhysicalSide>(
    () =>
      mountSide() ||
      (
        {
          top: 'top',
          right: 'right',
          bottom: 'bottom',
          left: 'left',
          'inline-end': isRtl() ? 'left' : 'right',
          'inline-start': isRtl() ? 'right' : 'left',
        } satisfies Record<Side, PhysicalSide>
      )[sideParam()],
  );

  const placementAlign = createMemo(() => mountAlign() || align());
  const placement = createMemo(() =>
    placementAlign() === 'center' ? side() : (`${side()}-${placementAlign()}` as Placement),
  );

  // Using a ref assumes that the arrow element is always present in the DOM for the lifetime of the
  // popup. If this assumption ends up being false, we can switch to state to manage the arrow's
  // presence.
  const arrowRef: RefObject<Element | null> = { current: null };

  // Port note: upstream rebuilds the middleware on every render and Floating UI compares it deeply.
  // This memo plays the role of the render: the values it reads are captured by the middleware
  // closures like upstream's render closures. The values upstream reads through refs
  // (`sideOffsetRef`, `alignOffsetRef`, `mountedRef`) are read untracked when the middleware runs.
  const positioning = createMemo(() => {
    const currentSideParam = sideParam();
    const currentIsRtl = isRtl();
    const currentSideOffset = sideOffset();
    const currentAlignOffset = alignOffset();
    const currentCollisionBoundary = collisionBoundary();
    const currentCollisionPaddingParam = collisionPaddingParam();
    const currentSticky = sticky();
    const currentArrowPadding = arrowPadding();
    const currentInlineMiddleware = inlineMiddleware();
    const currentCollisionAvoidanceSide = collisionAvoidanceSide();
    const currentCollisionAvoidanceAlign = collisionAvoidanceAlign();
    const currentCollisionAvoidanceFallbackAxisSide = collisionAvoidanceFallbackAxisSide();
    const currentShiftCrossAxis = shiftCrossAxis();
    const currentShiftRootBoundary = shiftRootBoundary();
    const currentPlacementAlign = placementAlign();
    const currentAdaptiveOrigin = adaptiveOrigin();

    let collisionPadding = currentCollisionPaddingParam as {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };

    if (typeof collisionPadding === 'number') {
      collisionPadding = {
        top: collisionPadding,
        right: collisionPadding,
        bottom: collisionPadding,
        left: collisionPadding,
      };
    } else if (collisionPadding) {
      collisionPadding = {
        top: collisionPadding.top || 0,
        right: collisionPadding.right || 0,
        bottom: collisionPadding.bottom || 0,
        left: collisionPadding.left || 0,
      };
    }

    // Create a bias to the preferred side.
    // On iOS, when the mobile software keyboard opens, the input is exactly centered
    // in the viewport, but this can cause it to flip to the top undesirably.
    // The bias is only applied to `flip()` so it doesn't shift the resting position
    // computed by `shift()` and `size()` away from the requested `collisionPadding`.
    const bias = 1;
    const biasTop = currentSideParam === 'bottom' ? bias : 0;
    const biasBottom = currentSideParam === 'top' ? bias : 0;
    const biasLeft = currentSideParam === 'right' ? bias : 0;
    const biasRight = currentSideParam === 'left' ? bias : 0;

    const commonCollisionProps = {
      boundary:
        currentCollisionBoundary === 'clipping-ancestors'
          ? 'clippingAncestors'
          : currentCollisionBoundary,
      padding: collisionPadding,
    } as const;

    // Keep these reactive if they're not functions
    const sideOffsetDep = typeof currentSideOffset !== 'function' ? currentSideOffset : 0;
    const alignOffsetDep = typeof currentAlignOffset !== 'function' ? currentAlignOffset : 0;

    const middleware: UseFloatingOptions['middleware'] = [];

    if (currentInlineMiddleware) {
      middleware.push(currentInlineMiddleware);
    }

    middleware.push(
      offset(
        (state) => {
          const data = getOffsetData(state, currentSideParam, currentIsRtl);

          const sideOffsetValue = untrack(sideOffset);
          const alignOffsetValue = untrack(alignOffset);
          const sideAxis =
            typeof sideOffsetValue === 'function' ? sideOffsetValue(data) : sideOffsetValue;
          const alignAxis =
            typeof alignOffsetValue === 'function' ? alignOffsetValue(data) : alignOffsetValue;

          return {
            mainAxis: sideAxis,
            crossAxis: alignAxis,
            alignmentAxis: alignAxis,
          };
        },
        [sideOffsetDep, alignOffsetDep, currentIsRtl, currentSideParam],
      ),
    );

    const shiftDisabled =
      currentCollisionAvoidanceAlign === 'none' && currentCollisionAvoidanceSide !== 'shift';
    const crossAxisShiftEnabled =
      !shiftDisabled &&
      (currentSticky || currentShiftCrossAxis || currentCollisionAvoidanceSide === 'shift');

    const flipMiddleware =
      currentCollisionAvoidanceSide === 'none'
        ? null
        : flip({
            ...commonCollisionProps,
            // Ensure the popup flips if it's been limited by its --available-height and it resizes.
            // Since the size() padding is smaller than the flip() padding, flip() will take precedence.
            padding: {
              top: collisionPadding.top + bias + biasTop,
              right: collisionPadding.right + bias + biasRight,
              bottom: collisionPadding.bottom + bias + biasBottom,
              left: collisionPadding.left + bias + biasLeft,
            },
            mainAxis: !currentShiftCrossAxis && currentCollisionAvoidanceSide === 'flip',
            crossAxis: currentCollisionAvoidanceAlign === 'flip' ? 'alignment' : false,
            fallbackAxisSideDirection: currentCollisionAvoidanceFallbackAxisSide,
          });
    const shiftMiddleware = shiftDisabled
      ? null
      : floatingShift(
          {
            ...commonCollisionProps,
            // Use the Layout Viewport to avoid shifting around when pinch-zooming.
            rootBoundary: currentShiftRootBoundary,
            mainAxis: currentCollisionAvoidanceAlign !== 'none',
            crossAxis: crossAxisShiftEnabled,
            limiter:
              currentSticky || currentShiftCrossAxis
                ? undefined
                : limitShift((limitData) => {
                    if (!arrowRef.current) {
                      return {};
                    }
                    const { width, height } = arrowRef.current.getBoundingClientRect();
                    const sideAxis = getSideAxis(getSide(limitData.placement));
                    const arrowSize = sideAxis === 'y' ? width : height;
                    const offsetAmount =
                      sideAxis === 'y'
                        ? collisionPadding.left + collisionPadding.right
                        : collisionPadding.top + collisionPadding.bottom;
                    return {
                      offset: arrowSize / 2 + offsetAmount / 2,
                    };
                  }),
          },
          [
            commonCollisionProps,
            currentSticky,
            currentShiftCrossAxis,
            currentShiftRootBoundary,
            collisionPadding,
            currentCollisionAvoidanceAlign,
          ],
        );

    // https://floating-ui.com/docs/flip#combining-with-shift
    // Keyed on the alignment actually being requested, not the raw prop: a locked alignment can
    // differ from `align`, and the ordering has to match the placement that is asked for.
    if (
      currentCollisionAvoidanceSide === 'shift' ||
      currentCollisionAvoidanceAlign === 'shift' ||
      currentPlacementAlign === 'center'
    ) {
      middleware.push(shiftMiddleware, flipMiddleware);
    } else {
      middleware.push(flipMiddleware, shiftMiddleware);
    }

    middleware.push(
      size({
        ...commonCollisionProps,
        apply({ elements: { floating }, availableWidth, availableHeight, rects }) {
          if (!untrack(mounted)) {
            return;
          }

          const floatingStyle = floating.style;
          floatingStyle.setProperty(AVAILABLE_WIDTH_VAR, `${availableWidth}px`);
          floatingStyle.setProperty(AVAILABLE_HEIGHT_VAR, `${availableHeight}px`);

          // Snap anchor dimensions to device pixels to ensure the popup's visual width matches the anchor's one.
          const dpr = ownerWindow(floating).devicePixelRatio || 1;
          const { x, y, width, height } = rects.reference;
          const anchorWidth = (Math.round((x + width) * dpr) - Math.round(x * dpr)) / dpr;
          const anchorHeight = (Math.round((y + height) * dpr) - Math.round(y * dpr)) / dpr;

          floatingStyle.setProperty(CommonPositionerCssVars.anchorWidth, `${anchorWidth}px`);
          floatingStyle.setProperty(CommonPositionerCssVars.anchorHeight, `${anchorHeight}px`);
        },
      }),
      arrow(
        (state) => ({
          // `transform-origin` calculations rely on an element existing. If the arrow hasn't been set,
          // we'll create a fake element.
          element: arrowRef.current || ownerDocument(state.elements.floating).createElement('div'),
          // No padding for the fake arrow: it would displace aligned popups on narrow anchors.
          padding: arrowRef.current ? currentArrowPadding : 0,
        }),
        [currentArrowPadding],
      ),
      {
        name: 'transformOrigin',
        fn(state) {
          const {
            elements: { floating },
            middlewareData,
            placement: renderedPlacement,
            platform,
            rects,
            y,
          } = state;

          const renderedSide = getSide(renderedPlacement);
          const renderedAlign = getAlignment(renderedPlacement);
          const isVertical = getSideAxis(renderedSide) === 'y';
          const arrowEl = arrowRef.current;

          const sideOffsetValue =
            typeof currentSideOffset === 'function'
              ? currentSideOffset(getOffsetData(state, currentSideParam, currentIsRtl))
              : currentSideOffset;

          // An aligned arrowless popup grows from its aligned edge, until a shift (beyond subpixel)
          // breaks its alignment with the anchor. Everything else grows from the arrow, real or fake.
          let crossOrigin: string;
          if (
            !arrowEl &&
            renderedAlign &&
            Math.abs(isVertical ? middlewareData.shift?.x || 0 : middlewareData.shift?.y || 0) <= 1
          ) {
            // The platform direction, not `isRtl`: it must match what Floating UI placed with.
            crossOrigin =
              (renderedAlign === 'start') === (isVertical && platform.isRTL?.(floating) === true)
                ? '100%'
                : '0%';
          } else {
            const arrowOffset = isVertical
              ? middlewareData.arrow?.x || 0
              : middlewareData.arrow?.y || 0;
            const arrowSize = isVertical ? arrowEl?.clientWidth || 0 : arrowEl?.clientHeight || 0;
            crossOrigin = `${arrowOffset + arrowSize / 2}px`;
          }

          // Side axis: the anchor-facing edge, or the anchor's center when the popup overlaps it.
          let sideOrigin =
            renderedSide === 'top' || renderedSide === 'left'
              ? `calc(100% + ${sideOffsetValue}px)`
              : `${-sideOffsetValue}px`;
          if (
            crossAxisShiftEnabled &&
            isVertical &&
            Math.abs(middlewareData.shift?.y || 0) > sideOffsetValue
          ) {
            sideOrigin = `${rects.reference.y + rects.reference.height / 2 - y}px`;
          }

          floating.style.setProperty(
            CommonPositionerCssVars.transformOrigin,
            isVertical ? `${crossOrigin} ${sideOrigin}` : `${sideOrigin} ${crossOrigin}`,
          );

          return {};
        },
      },
      hide,
      currentAdaptiveOrigin,
    );

    return middleware;
  });

  useIsoLayoutEffect(
    ([mountedValue, floatingRootContextValue]) => {
      // Ensure positioning doesn't run initially for `keepMounted` elements that
      // aren't initially open.
      if (!mountedValue && floatingRootContextValue) {
        floatingRootContextValue.update({
          referenceElement: null,
          floatingElement: null,
          domReferenceElement: null,
          positionReference: null,
        });
      }
    },
    () => [mounted(), floatingRootContext()],
  );

  const autoUpdateOptions = createMemo<AutoUpdateOptions>(() => ({
    ancestorScroll: !disableAnchorTracking(),
    elementResize: !disableAnchorTracking() && typeof ResizeObserver !== 'undefined',
    layoutShift: !disableAnchorTracking() && typeof IntersectionObserver !== 'undefined',
  }));

  const whileElementsMounted: UseFloatingOptions['whileElementsMounted'] = (...args) =>
    autoUpdate(...args, untrack(autoUpdateOptions));

  // Port note: the options are read lazily through getters (`rootContext`, `nodeId` and
  // `externalTree` are read once). The return value's reactive fields are getters, so they're read
  // from `floating` where upstream destructures them.
  const floating = useFloatingHook({
    get rootContext() {
      return floatingRootContext();
    },
    get open() {
      return keepMounted() ? mounted() : undefined;
    },
    get placement() {
      return placement();
    },
    get middleware() {
      return positioning();
    },
    get strategy() {
      return positionMethod();
    },
    get whileElementsMounted() {
      return keepMounted() ? undefined : whileElementsMounted;
    },
    get nodeId() {
      return params.nodeId;
    },
    get externalTree() {
      return params.externalTree;
    },
  });
  const { refs, elements, update, context } = floating;

  // Default to `fixed` when not positioned to prevent `autoFocus` scroll jumps.
  // This ensures the popup is inside the viewport initially before it gets positioned.
  const resolvedPosition = (): 'absolute' | 'fixed' =>
    floating.isPositioned ? positionMethod() : 'fixed';

  const floatingStyles = createMemo<JSX.CSSProperties>(() => {
    const isPositioned = floating.isPositioned;
    let base: JSX.CSSProperties & Record<string, unknown>;
    if (!isPositioned) {
      // Until a position for the current open is computed, ignore any coordinates retained from a
      // previous open (or from a pass that measured the hidden popup as 0x0). Rendering the
      // full-size popup at such stale coordinates can overflow the layout viewport, which makes
      // mobile Chrome zoom the page out and reflow everything the popup is anchored to.
      base = { position: resolvedPosition(), top: 0, left: 0 };
    } else if (adaptiveOrigin()) {
      const { sideX, sideY } = floating.middlewareData.adaptiveOrigin || DEFAULT_SIDES;
      // Port note: Solid doesn't add `px` to numeric style values.
      base = {
        position: resolvedPosition(),
        [sideX]: `${floating.x}px`,
        [sideY]: `${floating.y}px`,
      };
    } else {
      base = { ...floating.floatingStyles, position: resolvedPosition() };
    }

    // Seed the available size vars so consumer `max-height: min(x, var(--available-height))` rules
    // resolve to a valid length on the first positioning pass, before `size()` writes the real
    // values. Without a fallback the unresolved `var()` invalidates the whole declaration, so the
    // popup is measured unconstrained while `flip()` picks its side, against the full content
    // height rather than the capped one. Seeded unconditionally (not only while `!isPositioned`):
    // the keys must stay present with a constant value so React's per-property style diff never
    // rewrites them after mount, preserving the px values `size()` sets imperatively. Moving them
    // into the `!isPositioned` branch makes React remove them once positioned, wiping `size()`'s
    // values and leaving the popup unconstrained.
    base[AVAILABLE_WIDTH_VAR] = '100vw';
    base[AVAILABLE_HEIGHT_VAR] = '100vh';

    if (!isPositioned) {
      base.opacity = 0;
    }
    return base;
  });

  let registeredPositionReference: Element | VirtualElement | null = null;

  useIsoLayoutEffect(
    ([mountedValue]) => {
      if (!mountedValue) {
        return;
      }

      const anchorValue = untrack(anchor);
      const resolvedAnchor = typeof anchorValue === 'function' ? anchorValue() : anchorValue;
      const unwrappedElement =
        (isRef(resolvedAnchor) ? resolvedAnchor.current : resolvedAnchor) || null;
      const finalAnchor = unwrappedElement || null;

      if (finalAnchor !== registeredPositionReference) {
        refs.setPositionReference(finalAnchor);
        registeredPositionReference = finalAnchor;
      }
    },
    () => [mounted(), anchorDep()],
  );

  useEffect(
    ([mountedValue]) => {
      if (!mountedValue) {
        return;
      }

      const anchorValue = untrack(anchor);

      // Refs from parent components are set after useLayoutEffect runs and are available in useEffect.
      // Therefore, if the anchor is a ref, we need to update the position reference in useEffect.
      if (typeof anchorValue === 'function') {
        return;
      }

      if (isRef(anchorValue) && anchorValue.current !== registeredPositionReference) {
        refs.setPositionReference(anchorValue.current);
        registeredPositionReference = anchorValue.current;
      }
    },
    () => [mounted(), anchorDep()],
  );

  useEffect(
    ([
      keepMountedValue,
      mountedValue,
      referenceElement,
      floatingElement,
      autoUpdateOptionsValue,
    ]) => {
      if (keepMountedValue && mountedValue && referenceElement && floatingElement) {
        return autoUpdate(referenceElement, floatingElement, update, autoUpdateOptionsValue);
      }
      return undefined;
    },
    () =>
      [
        keepMounted(),
        mounted(),
        elements.reference,
        elements.floating,
        autoUpdateOptions(),
      ] as const,
  );

  const renderedPlacement = () => floating.placement;
  const renderedSide = createMemo(() => getSide(renderedPlacement()));
  const logicalRenderedSide = createMemo(() =>
    getLogicalSide(sideParam(), renderedSide(), isRtl()),
  );
  const renderedAlign = createMemo<Align>(() => getAlignment(renderedPlacement()) || 'center');
  const anchorHidden = createMemo(() => Boolean(floating.middlewareData.hide?.referenceHidden));

  // Locks the flipped side, and the alignment too when the consumer opts in, while filtering
  // resizes the popup.
  useIsoLayoutEffect(
    ([
      lazyFlipValue,
      lockAlignValue,
      mountedValue,
      isPositioned,
      renderedPlacementValue,
      renderedSideValue,
      renderedAlignValue,
      sideValue,
      placementAlignValue,
    ]) => {
      if (
        lazyFlipValue &&
        mountedValue &&
        isPositioned &&
        (renderedSideValue !== sideValue ||
          (lockAlignValue && renderedAlignValue !== placementAlignValue))
      ) {
        setMountPlacement(renderedPlacementValue);
      }
    },
    () => [
      lazyFlip(),
      lockAlign(),
      mounted(),
      floating.isPositioned,
      renderedPlacement(),
      renderedSide(),
      renderedAlign(),
      side(),
      placementAlign(),
    ],
  );

  const arrowStyles = createMemo<JSX.CSSProperties>(() => {
    const arrowData = floating.middlewareData.arrow;
    // Port note: Solid doesn't add `px` to numeric style values.
    return {
      position: 'absolute' as const,
      top: arrowData?.y != null ? `${arrowData.y}px` : undefined,
      left: arrowData?.x != null ? `${arrowData.x}px` : undefined,
    };
  });

  const arrowUncentered = createMemo(() => floating.middlewareData.arrow?.centerOffset !== 0);

  return {
    get positionerStyles() {
      return floatingStyles();
    },
    get arrowStyles() {
      return arrowStyles();
    },
    arrowRef,
    get arrowUncentered() {
      return arrowUncentered();
    },
    get side() {
      return logicalRenderedSide();
    },
    get align() {
      return renderedAlign();
    },
    get physicalSide() {
      return renderedSide();
    },
    get anchorHidden() {
      return anchorHidden();
    },
    refs,
    context,
    get isPositioned() {
      return floating.isPositioned;
    },
    update,
  };
}

function isRef(
  param: Element | VirtualElement | RefObject<any> | null | undefined,
): param is RefObject<any> {
  return param != null && 'current' in param;
}

export interface UseAnchorPositioningSharedParameters {
  /**
   * An element to position the popup against.
   * By default, the popup will be positioned against the trigger.
   */
  anchor?:
    | Element
    | null
    | VirtualElement
    | RefObject<Element | null>
    | (() => Element | VirtualElement | null)
    | undefined;
  /**
   * Determines which CSS `position` property to use.
   * @default 'absolute'
   */
  positionMethod?: 'absolute' | 'fixed' | undefined;
  /**
   * Which side of the anchor element to align the popup against.
   * May automatically change to avoid collisions.
   * @default 'bottom'
   */
  side?: Side | undefined;
  /**
   * Distance between the anchor and the popup in pixels.
   * Also accepts a function that returns the distance to read the dimensions of the anchor
   * and positioner elements, along with its side and alignment.
   *
   * The function takes a `data` object parameter with the following properties:
   * - `data.anchor`: the dimensions of the anchor element with properties `width` and `height`.
   * - `data.positioner`: the dimensions of the positioner element with properties `width` and `height`.
   * - `data.side`: which side of the anchor element the positioner is aligned against.
   * - `data.align`: how the positioner is aligned relative to the specified side.
   *
   * @example
   * ```jsx
   * <Positioner
   *   sideOffset={({ side, align, anchor, positioner }) => {
   *     return side === 'top' || side === 'bottom'
   *       ? anchor.height
   *       : anchor.width;
   *   }}
   * />
   * ```
   *
   * @default 0
   */
  sideOffset?: number | OffsetFunction | undefined;
  /**
   * How to align the popup relative to the specified side.
   * @default 'center'
   */
  align?: Align | undefined;
  /**
   * Additional offset along the alignment axis in pixels.
   * Also accepts a function that returns the offset to read the dimensions of the anchor
   * and positioner elements, along with its side and alignment.
   *
   * The function takes a `data` object parameter with the following properties:
   * - `data.anchor`: the dimensions of the anchor element with properties `width` and `height`.
   * - `data.positioner`: the dimensions of the positioner element with properties `width` and `height`.
   * - `data.side`: which side of the anchor element the positioner is aligned against.
   * - `data.align`: how the positioner is aligned relative to the specified side.
   *
   * @example
   * ```jsx
   * <Positioner
   *   alignOffset={({ side, align, anchor, positioner }) => {
   *     return side === 'top' || side === 'bottom'
   *       ? anchor.width
   *       : anchor.height;
   *   }}
   * />
   * ```
   *
   * @default 0
   */
  alignOffset?: number | OffsetFunction | undefined;
  /**
   * An element or a rectangle that delimits the area that the popup is confined to.
   * @default 'clipping-ancestors'
   */
  collisionBoundary?: Boundary | undefined;
  /**
   * Additional space to maintain from the edge of the collision boundary.
   * @default 5
   */
  collisionPadding?: Padding | undefined;
  /**
   * Whether to maintain the popup in the viewport after
   * the anchor element was scrolled out of view.
   * @default false
   */
  sticky?: boolean | undefined;
  /**
   * Minimum distance to maintain between the arrow and the edges of the popup.
   *
   * Use it to prevent the arrow element from hanging out of the rounded corners of a popup.
   * @default 5
   */
  arrowPadding?: number | undefined;
  /**
   * Whether to disable the popup from tracking any layout shift of its positioning anchor.
   * @default false
   */
  disableAnchorTracking?: boolean | undefined;
  /**
   * Determines how to handle collisions when positioning the popup.
   *
   * `side` controls overflow on the preferred placement axis (`top`/`bottom` or `left`/`right`):
   * - `'flip'`: keep the requested side when it fits; otherwise try the opposite side
   *   (`top` and `bottom`, or `left` and `right`).
   * - `'shift'`: never change side; keep the requested side and move the popup within
   *   the clipping boundary so it stays visible.
   * - `'none'`: do not correct side-axis overflow.
   *
   * `align` controls overflow on the alignment axis (`start`/`center`/`end`):
   * - `'flip'`: keep side, but swap `start` and `end` when the requested alignment overflows.
   * - `'shift'`: keep side and requested alignment, then nudge the popup along the
   *   alignment axis to fit.
   * - `'none'`: do not correct alignment-axis overflow.
   *
   * `fallbackAxisSide` controls fallback behavior on the perpendicular axis when the
   * preferred axis cannot fit:
   * - `'start'`: allow perpendicular fallback and try the logical start side first
   *   (`top` before `bottom`, or `left` before `right` in LTR).
   * - `'end'`: allow perpendicular fallback and try the logical end side first
   *   (`bottom` before `top`, or `right` before `left` in LTR).
   * - `'none'`: do not fallback to the perpendicular axis.
   *
   * When `side` is `'shift'`, explicitly setting `align` only supports `'shift'` or `'none'`.
   * If `align` is omitted, it defaults to `'flip'`.
   *
   * @example
   * ```jsx
   * <Positioner
   *   collisionAvoidance={{
   *     side: 'shift',
   *     align: 'shift',
   *     fallbackAxisSide: 'none',
   *   }}
   * />
   * ```
   *
   */
  collisionAvoidance?: CollisionAvoidance | undefined;
}

export interface UseAnchorPositioningParameters extends UseAnchorPositioningSharedParameters {
  keepMounted?: boolean | undefined;
  floatingRootContext?: FloatingRootContext | undefined;
  mounted: boolean;
  disableAnchorTracking: boolean;
  nodeId?: string | undefined;
  adaptiveOrigin?: Middleware | undefined;
  collisionAvoidance: CollisionAvoidance;
  shift?:
    | {
        crossAxis?: boolean | undefined;
        rootBoundary?: 'layoutViewport' | undefined;
      }
    | undefined;
  /**
   * Locks a flipped placement so it doesn't flip back eagerly while filtering resizes the
   * popup. `true` locks the side only; `'placement'` also locks the alignment.
   */
  lazyFlip?: boolean | 'placement' | undefined;
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Optional middleware that can replace the measured reference rect before offsets and collision
   * middleware run. Used by Preview Card to position against a specific inline line box.
   */
  inline?: Middleware | undefined;
}

/**
 * Port note: the reactive fields are getters (see `useAnchorPositioningWithHook`).
 */
export interface UseAnchorPositioningReturnValue {
  positionerStyles: JSX.CSSProperties;
  arrowStyles: JSX.CSSProperties;
  arrowRef: RefObject<Element | null>;
  arrowUncentered: boolean;
  side: Side;
  align: Align;
  physicalSide: PhysicalSide;
  anchorHidden: boolean;
  refs: UseFloatingReturn['refs'];
  context: FloatingContext;
  isPositioned: boolean;
  update: () => void;
}
