import { createMemo, omit } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { contains, getTarget, stopEvent } from '../../floating-ui-solid/utils';
import type { BaseUIComponentProps } from '../../internals/types';
import { useContextMenuRootContext } from '../root/ContextMenuRootContext';
import { useMenuRootContext } from '../../menu/root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../internals/reasons';
import { findRootOwnerId } from '../../menu/utils/findRootOwnerId';
// Port note: mutable containers replace React refs.
const refObject = <T,>(current: T): RefObject<T> => ({ current });

const LONG_PRESS_DELAY = 500;

/**
 * An area that opens the menu on right click or long press.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Context Menu](https://base-ui-solid.pages.dev/solid/components/context-menu)
 */
export function ContextMenuTrigger(componentProps: ContextMenuTrigger.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const context = useContextMenuRootContext(false);
  const {
    setAnchor,
    actionsRef,
    internalBackdropRef,
    backdropRef,
    positionerRef,
    allowMouseUpTriggerRef,
    initialCursorPointRef,
  } = context;

  const { store } = useMenuRootContext(false);
  const open = store.useState('open');
  const disabled = store.useState('disabled');

  const triggerRef = refObject<HTMLDivElement | null>(null);
  const touchPositionRef = refObject<{ x: number; y: number } | null>(null);
  const longPressTimeout = useTimeout();
  const allowMouseUpTimeout = useTimeout();
  const allowMouseUpRef = refObject(false);
  const mouseUpAbortControllerRef = refObject<AbortController | null>(null);

  function handleLongPress(x: number, y: number, event: MouseEvent | TouchEvent) {
    const isTouchEvent = event.type.startsWith('touch');

    initialCursorPointRef.current = { x, y };

    setAnchor({
      getBoundingClientRect() {
        return DOMRect.fromRect({
          width: isTouchEvent ? 10 : 0,
          height: isTouchEvent ? 10 : 0,
          x,
          y,
        });
      },
    });

    allowMouseUpRef.current = false;
    actionsRef.current?.setOpen(true, createChangeEventDetails(REASONS.triggerPress, event));

    allowMouseUpTimeout.start(LONG_PRESS_DELAY, () => {
      allowMouseUpRef.current = true;
    });
  }

  function handleContextMenu(event: MouseEvent) {
    if (disabled()) {
      return;
    }
    allowMouseUpTriggerRef.current = true;
    stopEvent(event);
    handleLongPress(event.clientX, event.clientY, event);
    const doc = ownerDocument(triggerRef.current);

    // Abort a listener from a previous trigger that never saw its mouseup, and scope this
    // one to a fresh controller so it's removed on unmount if the mouseup never arrives.
    mouseUpAbortControllerRef.current?.abort();
    const mouseUpAbortController = new AbortController();
    mouseUpAbortControllerRef.current = mouseUpAbortController;
    doc.addEventListener(
      'mouseup',
      (mouseEvent) => {
        allowMouseUpTriggerRef.current = false;

        if (!allowMouseUpRef.current) {
          return;
        }

        allowMouseUpTimeout.clear();
        allowMouseUpRef.current = false;

        const mouseUpTarget = getTarget(mouseEvent) as Element | null;

        if (contains(positionerRef.current, mouseUpTarget)) {
          return;
        }

        if (context.rootId && mouseUpTarget && findRootOwnerId(mouseUpTarget) === context.rootId) {
          return;
        }

        actionsRef.current?.setOpen(
          false,
          createChangeEventDetails(REASONS.cancelOpen, mouseEvent),
        );
      },
      { once: true, signal: mouseUpAbortController.signal },
    );
  }

  function cancelLongPress() {
    longPressTimeout.clear();
    touchPositionRef.current = null;
  }

  function handleTouchStart(event: TouchEvent) {
    if (disabled()) {
      cancelLongPress();
      return;
    }
    allowMouseUpTriggerRef.current = false;
    if (event.touches.length !== 1) {
      cancelLongPress();
      return;
    }

    event.stopPropagation();
    const touch = event.touches[0];
    const touchPosition = { x: touch.clientX, y: touch.clientY };
    touchPositionRef.current = touchPosition;
    longPressTimeout.start(LONG_PRESS_DELAY, () => {
      handleLongPress(touchPosition.x, touchPosition.y, event);
    });
  }

  function handleTouchMove(event: TouchEvent) {
    if (event.touches.length !== 1) {
      cancelLongPress();
      return;
    }

    if (longPressTimeout.isStarted() && touchPositionRef.current) {
      const touch = event.touches[0];
      const moveThreshold = 10;

      const deltaX = Math.abs(touch.clientX - touchPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchPositionRef.current.y);

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        cancelLongPress();
      }
    }
  }

  useEffect(
    () => () => {
      // Abort a pending mouseup listener if the trigger unmounts before it fires.
      mouseUpAbortControllerRef.current?.abort();
    },
    () => [],
  );

  useEffect(
    () => {
      function handleDocumentContextMenu(event: MouseEvent) {
        if (disabled()) {
          return;
        }

        const target = getTarget(event);
        const targetElement = target as HTMLElement | null;
        if (
          contains(triggerRef.current, targetElement) ||
          contains(internalBackdropRef.current, targetElement) ||
          contains(backdropRef.current, targetElement)
        ) {
          event.preventDefault();
        }
      }

      const doc = ownerDocument(triggerRef.current);
      return addEventListener(doc, 'contextmenu', handleDocumentContextMenu);
    },
    () => [backdropRef, disabled(), internalBackdropRef],
  );

  const state = createMemo<ContextMenuTriggerState>(() => ({ open: open() }));

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [
      (element) => {
        triggerRef.current = element;
      },
    ],
    props: [
      {
        onContextMenu: handleContextMenu,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: cancelLongPress,
        onTouchCancel: cancelLongPress,
        style: {
          '-webkit-touch-callout': 'none',
        },
      },
      elementProps,
    ],
    stateAttributesMapping: pressableTriggerOpenStateMapping,
  });

  return element;
}

export interface ContextMenuTriggerState {
  /**
   * Whether the context menu is currently open.
   */
  open: boolean;
}

export interface ContextMenuTriggerProps extends BaseUIComponentProps<
  'div',
  ContextMenuTriggerState
> {}

export namespace ContextMenuTrigger {
  export type State = ContextMenuTriggerState;
  export type Props = ContextMenuTriggerProps;
}
