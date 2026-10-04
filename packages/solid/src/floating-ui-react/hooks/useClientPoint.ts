import { createMemo, createSignal } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { getWindow } from '@floating-ui/utils/dom';
import type { ContextData, ElementProps, FloatingRootContext } from '../types';
import { contains, getTarget } from '../utils/element';
import { isMouseLikePointerType } from '../utils/event';

function createVirtualElement(
  domElement: Element | null | undefined,
  data: {
    axis: 'x' | 'y' | 'both';
    dataRef: RefObject<ContextData>;
    pointerType: string | undefined;
    x: number | null;
    y: number | null;
  },
) {
  let offsetX: number | null = null;
  let offsetY: number | null = null;
  let isAutoUpdateEvent = false;

  return {
    contextElement: domElement || undefined,
    getBoundingClientRect() {
      const domRect = domElement?.getBoundingClientRect() || {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      };

      const isXAxis = data.axis === 'x' || data.axis === 'both';
      const isYAxis = data.axis === 'y' || data.axis === 'both';
      const canTrackCursorOnAutoUpdate =
        ['mouseenter', 'mousemove'].includes(data.dataRef.current.openEvent?.type || '') &&
        data.pointerType !== 'touch';

      const width = data.axis === 'y' ? domRect.width : 0;
      const height = data.axis === 'x' ? domRect.height : 0;
      let x = domRect.x;
      let y = domRect.y;

      if (offsetX == null && data.x && isXAxis) {
        offsetX = domRect.x - data.x;
      }

      if (offsetY == null && data.y && isYAxis) {
        offsetY = domRect.y - data.y;
      }

      x -= offsetX || 0;
      y -= offsetY || 0;

      if (!isAutoUpdateEvent || canTrackCursorOnAutoUpdate) {
        x = isXAxis && data.x != null ? data.x : x;
        y = isYAxis && data.y != null ? data.y : y;
      }

      isAutoUpdateEvent = true;

      return {
        width,
        height,
        x,
        y,
        top: y,
        right: x + width,
        bottom: y + height,
        left: x,
      };
    },
  };
}

function isMouseBasedEvent(event: Event | undefined): event is MouseEvent {
  return event != null && (event as MouseEvent).clientX != null;
}

/**
 * Port note: read lazily like Solid props (`props.x`), so pass a props-like object with getters
 * for reactive options.
 */
export interface UseClientPointProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Whether to restrict the client point to an axis and use the reference
   * element (if it exists) as the other axis. This can be useful if the
   * floating element is also interactive.
   * @default 'both'
   */
  axis?: 'x' | 'y' | 'both' | undefined;
}

/**
 * Positions the floating element relative to a client point (in the viewport),
 * such as the mouse position. By default, it follows the mouse cursor.
 * @see https://floating-ui.com/docs/useClientPoint
 */
export function useClientPoint(
  store: FloatingRootContext,
  props: UseClientPointProps = {},
): ElementProps {
  const enabled = () => props.enabled ?? true;
  const axis = () => props.axis ?? 'both';

  const open = store.useState('open');
  const floating = store.useState('floatingElement');
  const domReference = store.useState('domReferenceElement');

  const dataRef = store.context.dataRef;

  let initial = false;
  let cleanupListenerRef: null | (() => void) = null;

  const [pointerType, setPointerType] = createSignal<string | undefined>();
  const [reactive, setReactive] = createSignal<never[]>([]);

  function resetReference(reference: Element | null) {
    store.set('positionReference', reference);
  }

  function setReference(
    newX: number | null,
    newY: number | null,
    referenceElement?: Element | null,
  ) {
    if (initial) {
      return;
    }

    // Prevent setting if the open event was not a mouse-like one
    // (e.g. focus to open, then hover over the reference element).
    // Only apply if the event exists.
    if (dataRef.current.openEvent && !isMouseBasedEvent(dataRef.current.openEvent)) {
      return;
    }

    store.set(
      'positionReference',
      createVirtualElement(referenceElement ?? domReference(), {
        x: newX,
        y: newY,
        axis: axis(),
        dataRef,
        pointerType: pointerType(),
      }),
    );
  }

  function handleReferenceEnterOrMove(event: MouseEvent) {
    if (!open()) {
      setReference(event.clientX, event.clientY, event.currentTarget as Element);
    } else if (!cleanupListenerRef) {
      // If there's no cleanup, there's no listener, but we want to ensure
      // we add the listener if the cursor landed on the floating element and
      // then back on the reference (i.e. it's interactive).
      setReference(event.clientX, event.clientY, event.currentTarget as Element);
      setReactive([]);
    }
  }

  // If the pointer is a mouse-like pointer, we want to continue following the
  // mouse even if the floating element is transitioning out. On touch
  // devices, this is undesirable because the floating element will move to
  // the dismissal touch point.
  const openCheck = createMemo(() => (isMouseLikePointerType(pointerType()) ? floating() : open()));

  useEffect(
    ([openCheckValue, isEnabled, floatingValue, domReferenceValue]) => {
      if (!isEnabled) {
        resetReference(domReferenceValue);
        return undefined;
      }

      if (!openCheckValue) {
        return undefined;
      }

      function cleanupListener() {
        cleanupListenerRef?.();
        cleanupListenerRef = null;
      }

      const win = getWindow(floatingValue);

      function handleMouseMove(event: MouseEvent) {
        const target = getTarget(event) as Element | null;

        if (!contains(floatingValue, target)) {
          setReference(event.clientX, event.clientY);
        } else {
          cleanupListener();
        }
      }

      if (!dataRef.current.openEvent || isMouseBasedEvent(dataRef.current.openEvent)) {
        cleanupListenerRef = addEventListener(win, 'mousemove', handleMouseMove);
      } else {
        resetReference(domReferenceValue);
      }

      return cleanupListener;
    },
    () => [openCheck(), enabled(), floating(), domReference(), reactive()] as const,
  );

  // Clear virtual cursor references when the hook unmounts. Enabled flips are handled above.
  useEffect(
    () => () => {
      store.set('positionReference', null);
    },
    () => [store],
  );

  useEffect(
    ([isEnabled, floatingValue]) => {
      if (isEnabled && !floatingValue) {
        initial = false;
      }
    },
    () => [enabled(), floating()],
  );

  useEffect(
    ([isEnabled, isOpen]) => {
      if (!isEnabled && isOpen) {
        initial = true;
      }
    },
    () => [enabled(), open()],
  );

  function setPointerTypeRef(event: PointerEvent) {
    setPointerType(event.pointerType);
  }

  const reference: NonNullable<ElementProps['reference']> = {
    onPointerDown: setPointerTypeRef,
    onPointerEnter: setPointerTypeRef,
    onMouseMove: handleReferenceEnterOrMove,
    onMouseEnter: handleReferenceEnterOrMove,
  };

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
    get trigger() {
      return enabled() ? reference : undefined;
    },
  };
}
