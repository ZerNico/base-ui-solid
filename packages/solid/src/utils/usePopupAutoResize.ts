import { createMemo } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { NOOP, EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { useAnimationsFinished } from '../internals/useAnimationsFinished';
import { getCssDimensions } from './getCssDimensions';
import type { Dimensions } from '../floating-ui-react/types';
import type { Side } from '../internals/useAnchorPositioning';
import * as CommonPopupCssVars from './CommonPopupCssVars';
import * as CommonPositionerCssVars from './CommonPositionerCssVars';

/**
 * Allows the element to automatically resize based on its content while supporting animations.
 *
 * Port note: `parameters` is read lazily (pass getters for reactive values). The callbacks are
 * read when they're called, like upstream's stable callbacks.
 */
export function usePopupAutoResize(parameters: UsePopupAutoResizeParameters) {
  const runOnceAnimationsFinish = useAnimationsFinished(() => parameters.popupElement, true);

  const animationFrame = useAnimationFrame();

  let committedDimensions: Dimensions | null = null;

  const onMeasureLayout = () => parameters.onMeasureLayout?.();
  const onMeasureLayoutComplete = (
    previousDimensions: Dimensions | null,
    newDimensions: Dimensions,
  ) => parameters.onMeasureLayoutComplete?.(previousDimensions, newDimensions);

  const anchoringStyles = createMemo(() =>
    getPopupAnchoringStyles(parameters.side, parameters.direction),
  );

  useIsoLayoutEffect(
    ([, popupElement, positionerElement, mounted, anchoringStylesValue]) => {
      // Reset the state when the popup is closed.
      if (!mounted) {
        committedDimensions = null;
        return undefined;
      }

      if (!popupElement || !positionerElement) {
        return undefined;
      }

      const restoreAnchoringStyles = applyElementStyles(
        popupElement,
        anchoringStylesValue as Record<string, string>,
      );

      // Measure the rendered size to enable transitions:
      setPopupCssSize(popupElement, 'auto');

      const restorePopupPosition = overrideElementStyle(popupElement, 'position', 'static');
      const restorePopupTransform = overrideElementStyle(popupElement, 'transform', 'none');
      const restorePopupScale = overrideElementStyle(popupElement, 'scale', '1');
      const restorePositionerAvailableSize = applyElementStyles(positionerElement, {
        [CommonPositionerCssVars.availableWidth]: 'max-content',
        [CommonPositionerCssVars.availableHeight]: 'max-content',
      });

      function restoreMeasurementOverrides() {
        restorePopupPosition();
        restorePopupTransform();
        restorePositionerAvailableSize();
        restorePopupScale();
      }

      onMeasureLayout?.();

      // Initial render (for each time the popup opens).
      if (committedDimensions === null) {
        setPositionerCssSize(positionerElement, 'max-content');

        const dimensions = getCssDimensions(popupElement);

        committedDimensions = dimensions;

        setPositionerCssSize(positionerElement, dimensions);
        restoreMeasurementOverrides();
        onMeasureLayoutComplete?.(null, dimensions);

        return restoreAnchoringStyles;
      }

      // Subsequent renders while open (when `content` changes).
      setPositionerCssSize(positionerElement, 'max-content');

      const previousDimensions = committedDimensions;
      const newDimensions = getCssDimensions(popupElement);

      // Commit immediately so future content changes have a stable previous size.
      committedDimensions = newDimensions;

      setPopupCssSize(popupElement, previousDimensions);
      restoreMeasurementOverrides();
      onMeasureLayoutComplete?.(previousDimensions, newDimensions);

      setPositionerCssSize(positionerElement, newDimensions);

      const abortController = new AbortController();

      animationFrame.request(() => {
        setPopupCssSize(popupElement, newDimensions);

        runOnceAnimationsFinish(() => {
          popupElement.style.setProperty(CommonPopupCssVars.popupWidth, 'auto');
          popupElement.style.setProperty(CommonPopupCssVars.popupHeight, 'auto');
        }, abortController.signal);
      });

      return () => {
        abortController.abort();
        animationFrame.cancel();
        restoreAnchoringStyles();
      };
    },
    () =>
      [
        parameters.content,
        parameters.popupElement,
        parameters.positionerElement,
        parameters.mounted,
        anchoringStyles(),
      ] as const,
  );
}

interface UsePopupAutoResizeParameters {
  /**
   * Element to resize.
   */
  popupElement: HTMLElement | null;
  /*
   * Positioner element (parent of the popup)
   */
  positionerElement: HTMLElement | null;
  /**
   * Whether the popup is mounted.
   */
  mounted: boolean;
  /*
   * Content that may change and trigger a resize.
   * This doesn't have to be the actual content of the popup, but a value that triggers a resize.
   */
  content: unknown;
  /**
   * Callback fired immediately before measuring the dimensions of the new content.
   */
  onMeasureLayout?: (() => void) | undefined;
  /**
   * Callback fired after the new dimensions have been measured.
   *
   * @param previousDimensions Dimensions before the change, or `null` if this is the first measurement.
   * @param newDimensions Newly measured dimensions.
   */
  onMeasureLayoutComplete?:
    ((previousDimensions: Dimensions | null, newDimensions: Dimensions) => void) | undefined;

  side: Side;
  direction: 'ltr' | 'rtl';
}

function getPopupAnchoringStyles(side: Side, direction: 'ltr' | 'rtl'): JSX.CSSProperties {
  // Ensure popup size transitions correctly when anchored to `bottom` (side=top) or `right` (side=left).
  const isPhysicalTop = side === 'top';
  const isPhysicalLeft =
    side === 'left' || side === (direction === 'rtl' ? 'inline-end' : 'inline-start');

  if (!isPhysicalTop && !isPhysicalLeft) {
    return EMPTY_OBJECT;
  }

  return {
    position: 'absolute',
    [isPhysicalTop ? 'bottom' : 'top']: '0',
    [isPhysicalLeft ? 'right' : 'left']: '0',
  };
}

function overrideElementStyle(element: HTMLElement, property: string, value: string) {
  const originalValue = element.style.getPropertyValue(property);
  element.style.setProperty(property, value);

  return () => {
    element.style.setProperty(property, originalValue);
  };
}

function applyElementStyles(element: HTMLElement, styles: Record<string, string>) {
  const restorers: Array<() => void> = [];

  for (const [key, value] of Object.entries(styles)) {
    restorers.push(overrideElementStyle(element, key, value));
  }

  return restorers.length
    ? () => {
        restorers.forEach((restore) => restore());
      }
    : NOOP;
}

function setPopupCssSize(popupElement: HTMLElement, size: Dimensions | 'auto') {
  const width = size === 'auto' ? 'auto' : `${size.width}px`;
  const height = size === 'auto' ? 'auto' : `${size.height}px`;
  popupElement.style.setProperty(CommonPopupCssVars.popupWidth, width);
  popupElement.style.setProperty(CommonPopupCssVars.popupHeight, height);
}

function setPositionerCssSize(positionerElement: HTMLElement, size: Dimensions | 'max-content') {
  const width = size === 'max-content' ? 'max-content' : `${size.width}px`;
  const height = size === 'max-content' ? 'max-content' : `${size.height}px`;
  positionerElement.style.setProperty(CommonPositionerCssVars.positionerWidth, width);
  positionerElement.style.setProperty(CommonPositionerCssVars.positionerHeight, height);
}
