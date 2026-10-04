import { createMemo, createSignal, flush, omit, onCleanup, Show, untrack } from 'solid-js';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { ownerWindow } from '@base-ui-solid/utils/owner';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { useValueAsRef } from '@base-ui-solid/utils/useValueAsRef';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import {
  safePolygon,
  useClick,
  useFloatingRootContext,
  useFloatingTree,
  useHoverReferenceInteraction,
} from '../../floating-ui-solid';
import {
  applySafePolygonPointerEventsMutation,
  clearSafePolygonPointerEventsMutation,
  useHoverInteractionSharedState,
} from '../../floating-ui-solid/hooks/useHoverInteractionSharedState';
import {
  closest,
  contains,
  getTabbableNearElement,
  getNextTabbable,
  getPreviousTabbable,
  isOutsideEvent,
  stopEvent,
} from '../../floating-ui-solid/utils';
import type { HandleCloseContextBase } from '../../floating-ui-solid/hooks/useHoverShared';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useNavigationMenuItemContext } from '../item/NavigationMenuItemContext';
import {
  useNavigationMenuRootContext,
  useNavigationMenuTreeContext,
} from '../root/NavigationMenuRootContext';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { ownerVisuallyHidden, PATIENT_CLICK_THRESHOLD } from '../../internals/constants';
import { FocusGuard } from '../../utils/FocusGuard';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { TransitionStatusDataAttributes } from '../../internals/stateAttributesMapping';
import { isOutsideMenuEvent } from '../utils/isOutsideMenuEvent';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';
import { useButton } from '../../internals/use-button';
import { useAnimationsFinished } from '../../internals/useAnimationsFinished';
import { getCssDimensions } from '../../utils/getCssDimensions';
import type { NavigationMenuRoot } from '../root/NavigationMenuRoot';
import { NAVIGATION_MENU_TRIGGER_IDENTIFIER } from '../utils/constants';
import { setSharedFixedSize } from '../utils/setSharedFixedSize';
import { useNavigationMenuDismissContext } from '../list/NavigationMenuDismissContext';
import * as NavigationMenuPopupCssVars from '../popup/NavigationMenuPopupCssVars';
import * as NavigationMenuPositionerCssVars from '../positioner/NavigationMenuPositionerCssVars';
import { mergeProps } from '../../merge-props';
import { useDirection } from '../../internals/direction-context/DirectionContext';

const DEFAULT_SIZE = { width: 0, height: 0 };

/**
 * Opens the navigation menu popup when hovered or clicked, revealing the
 * associated content.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuTrigger(componentProps: NavigationMenuTrigger.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'nativeButton', 'disabled');
  const nativeButton = () => componentProps.nativeButton ?? true;
  const disabled = () => componentProps.disabled ?? false;

  const {
    value,
    setValue,
    mounted,
    open,
    positionerElement,
    setActivationDirection,
    setFloatingRootContext,
    popupElement,
    viewportElement,
    transitionStatus,
    rootRef,
    beforeOutsideRef,
    afterOutsideRef,
    afterInsideRef,
    beforeInsideRef,
    prevTriggerElementRef,
    popupAutoSizeResetRef,
    currentContentRef,
    delay,
    closeDelay,
    orientation,
    setViewportInert,
    nested,
  } = useNavigationMenuRootContext();
  const { value: itemValue } = useNavigationMenuItemContext();
  const nodeId = useNavigationMenuTreeContext();
  const tree = useFloatingTree();
  const dismissProps = useNavigationMenuDismissContext();
  const direction = useDirection();

  const stickIfOpenTimeout = useTimeout();
  const mutationFrame = useAnimationFrame();
  const resizeFrame = useAnimationFrame();
  const sizeFrame = useAnimationFrame();

  const [triggerElement, setTriggerElement] = createSignal<HTMLElement | null>(null, {
    ownedWrite: true,
  });
  const [stickIfOpen, setStickIfOpen] = createSignal(true, { ownedWrite: true });
  const [pointerType, setPointerType] = createSignal<'mouse' | 'touch' | 'pen' | ''>('', {
    ownedWrite: true,
  });

  const triggerElementRef: RefObject<HTMLElement | null> = { current: null };
  let prevSize = DEFAULT_SIZE;
  let skipAutoSizeSync = false;

  const isActiveItem = createMemo(() => open() && value() === itemValue());
  const isActiveItemRef = useValueAsRef(isActiveItem);
  const interactionsEnabled = () => (positionerElement() != null || value() == null) && !disabled();
  const hoverFloatingElement = () => positionerElement() || viewportElement();
  const hoverInteractionsEnabled = () =>
    (hoverFloatingElement() != null || value() == null) && !disabled();

  const runOnceAnimationsFinish = useAnimationsFinished(popupElement);

  const handleTriggerElement = (element: HTMLElement | null) => {
    triggerElementRef.current = element;
    setTriggerElement(element);
  };

  const cancelAutoSizeReset = (force = false) => {
    if (!force && popupAutoSizeResetRef.current.owner !== untrack(itemValue)) {
      return;
    }

    popupAutoSizeResetRef.current.abortController?.abort();
    popupAutoSizeResetRef.current.abortController = null;
    popupAutoSizeResetRef.current.owner = null;
  };

  useIsoLayoutEffect(
    ([isActive]) => {
      if (isActive) {
        return;
      }

      mutationFrame.cancel();
      sizeFrame.cancel();
      cancelAutoSizeReset();
    },
    () => [isActiveItem()],
  );

  function setAutoSizes(element: HTMLElement) {
    element.style.setProperty(NavigationMenuPopupCssVars.popupWidth, 'auto');
    element.style.setProperty(NavigationMenuPopupCssVars.popupHeight, 'auto');
  }

  function clearFixedSizes(popup: HTMLElement, positioner: HTMLElement) {
    popup.style.removeProperty(NavigationMenuPopupCssVars.popupWidth);
    popup.style.removeProperty(NavigationMenuPopupCssVars.popupHeight);
    positioner.style.removeProperty(NavigationMenuPositionerCssVars.positionerWidth);
    positioner.style.removeProperty(NavigationMenuPositionerCssVars.positionerHeight);
  }

  function scheduleAutoSizeReset(popup: HTMLElement) {
    cancelAutoSizeReset(true);

    const abortController = new AbortController();
    popupAutoSizeResetRef.current.abortController = abortController;
    popupAutoSizeResetRef.current.owner = untrack(itemValue);

    runOnceAnimationsFinish(() => {
      popupAutoSizeResetRef.current.abortController = null;
      popupAutoSizeResetRef.current.owner = null;
      setAutoSizes(popup);
    }, abortController.signal);
  }

  const handleValueChange = (
    popup: HTMLElement,
    positioner: HTMLElement,
    currentWidthParam: number,
    currentHeightParam: number,
  ) => {
    let currentWidth = currentWidthParam;
    let currentHeight = currentHeightParam;

    cancelAutoSizeReset(true);

    clearFixedSizes(popup, positioner);

    const { width, height } = getCssDimensions(popup);
    const measuredWidth = width || prevSize.width;
    const measuredHeight = height || prevSize.height;

    if (currentHeight === 0 || currentWidth === 0) {
      currentWidth = measuredWidth;
      currentHeight = measuredHeight;
    }

    popup.style.setProperty(NavigationMenuPopupCssVars.popupWidth, `${currentWidth}px`);
    popup.style.setProperty(NavigationMenuPopupCssVars.popupHeight, `${currentHeight}px`);
    positioner.style.setProperty(
      NavigationMenuPositionerCssVars.positionerWidth,
      `${measuredWidth}px`,
    );
    positioner.style.setProperty(
      NavigationMenuPositionerCssVars.positionerHeight,
      `${measuredHeight}px`,
    );

    sizeFrame.request(() => {
      if (!isActiveItemRef.current) {
        return;
      }

      popup.style.setProperty(NavigationMenuPopupCssVars.popupWidth, `${measuredWidth}px`);
      popup.style.setProperty(NavigationMenuPopupCssVars.popupHeight, `${measuredHeight}px`);

      scheduleAutoSizeReset(popup);
    });
  };

  const handleInterruptedMutationResize = (
    popup: HTMLElement,
    positioner: HTMLElement,
    currentWidth: number,
    currentHeight: number,
  ) => {
    sizeFrame.cancel();
    mutationFrame.cancel();
    cancelAutoSizeReset(true);

    if (currentWidth === 0 || currentHeight === 0) {
      return;
    }

    setSharedFixedSize(popup, positioner, currentWidth, currentHeight);

    mutationFrame.request(() => {
      mutationFrame.request(() => {
        clearFixedSizes(popup, positioner);

        const { width, height } = getCssDimensions(popup);
        const measuredWidth = width || currentWidth;
        const measuredHeight = height || currentHeight;

        setSharedFixedSize(popup, positioner, currentWidth, currentHeight);

        sizeFrame.request(() => {
          if (!isActiveItemRef.current) {
            return;
          }

          setSharedFixedSize(popup, positioner, measuredWidth, measuredHeight);
          scheduleAutoSizeReset(popup);
        });
      });
    });
  };

  const syncCurrentSize = (popup: HTMLElement, positioner: HTMLElement) => {
    sizeFrame.cancel();
    cancelAutoSizeReset(true);

    clearFixedSizes(popup, positioner);

    const { width, height } = getCssDimensions(popup);

    if (width === 0 || height === 0) {
      return;
    }

    prevSize = { width, height };
    setAutoSizes(popup);
    positioner.style.setProperty(NavigationMenuPositionerCssVars.positionerWidth, `${width}px`);
    positioner.style.setProperty(NavigationMenuPositionerCssVars.positionerHeight, `${height}px`);
  };

  const getMutationBaseline = (popup: HTMLElement) => {
    const popupWidth = popup.style.getPropertyValue(NavigationMenuPopupCssVars.popupWidth);
    const popupHeight = popup.style.getPropertyValue(NavigationMenuPopupCssVars.popupHeight);
    const isResizing =
      popupWidth !== '' && popupWidth !== 'auto' && popupHeight !== '' && popupHeight !== 'auto';

    if (!isResizing) {
      return { size: prevSize, syncPositioner: false };
    }

    return {
      size: {
        width: popup.offsetWidth || prevSize.width,
        height: popup.offsetHeight || prevSize.height,
      },
      syncPositioner: true,
    };
  };

  useEffect(
    ([isOpen]) => {
      if (!isOpen) {
        stickIfOpenTimeout.clear();
        mutationFrame.cancel();
        resizeFrame.cancel();
        sizeFrame.cancel();
        cancelAutoSizeReset(true);
        skipAutoSizeSync = false;
        setPointerType('');
      }
    },
    () => [open()],
  );

  useEffect(
    ([isMounted]) => {
      if (!isMounted) {
        prevSize = DEFAULT_SIZE;
      }
    },
    () => [mounted()],
  );

  useIsoLayoutEffect(
    ([popup]) => {
      if (!popup || typeof ResizeObserver !== 'function') {
        return undefined;
      }

      const resizeObserver = new ResizeObserver(() => {
        prevSize = {
          width: popup.offsetWidth,
          height: popup.offsetHeight,
        };
      });

      resizeObserver.observe(popup);

      return () => {
        resizeObserver.disconnect();
      };
    },
    () => [popupElement()],
  );

  useEffect(
    ([isOpen, isActive, popup, positioner]) => {
      if (!isOpen || !isActive || !popup || !positioner) {
        return undefined;
      }

      const win = ownerWindow(positioner);
      function handleResize() {
        resizeFrame.cancel();
        resizeFrame.request(() => syncCurrentSize(popup!, positioner!));
      }

      const unsubscribe = addEventListener(win, 'resize', handleResize);

      return () => {
        resizeFrame.cancel();
        unsubscribe();
      };
    },
    () => [open(), isActiveItem(), popupElement(), positionerElement()],
  );

  useEffect(
    ([popup, positioner, isActive, status]) => {
      const observedElement = currentContentRef.current;

      if (
        !observedElement ||
        !popup ||
        !positioner ||
        !isActive ||
        typeof MutationObserver !== 'function'
      ) {
        return undefined;
      }

      const mutationObserver = new MutationObserver(() => {
        if (
          status === 'starting' ||
          popup.hasAttribute(TransitionStatusDataAttributes.startingStyle)
        ) {
          syncCurrentSize(popup, positioner);
          return;
        }

        const { size, syncPositioner } = getMutationBaseline(popup);

        if (syncPositioner) {
          handleInterruptedMutationResize(popup, positioner, size.width, size.height);
          return;
        }

        handleValueChange(popup, positioner, size.width, size.height);
      });

      mutationObserver.observe(observedElement, {
        childList: true,
        subtree: true,
        characterData: true,
        // `keepMounted` submenu switches update dimensions by toggling hidden
        // content rather than inserting or removing content nodes.
        attributes: true,
        attributeFilter: ['hidden'],
      });

      return () => {
        mutationObserver.disconnect();
      };
    },
    () =>
      [
        popupElement(),
        positionerElement(),
        isActiveItem(),
        transitionStatus(),
        currentContentRef,
      ] as const,
  );

  useIsoLayoutEffect(
    ([isOpen, popup, positioner]) => {
      if (isActiveItemRef.current && isOpen && popup && positioner) {
        if (skipAutoSizeSync) {
          skipAutoSizeSync = false;
          return undefined;
        }

        const { width, height } = getCssDimensions(popup);
        handleValueChange(popup, positioner, width, height);
      }
      return undefined;
    },
    () => [open(), popupElement(), positionerElement(), transitionStatus(), currentContentRef],
  );

  function handleOpenChange(
    nextOpen: boolean,
    eventDetails: Omit<NavigationMenuRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) {
    const isHover = eventDetails.reason === REASONS.triggerHover;

    if (!untrack(interactionsEnabled)) {
      return;
    }

    if (untrack(pointerType) === 'touch' && isHover) {
      return;
    }

    if (!nextOpen && untrack(value) !== untrack(itemValue)) {
      return;
    }

    function changeState() {
      if (isHover) {
        // Only allow "patient" clicks to close the popup if it's open.
        // If they clicked within 500ms of the popup opening, keep it open.
        setStickIfOpen(true);
        stickIfOpenTimeout.clear();
        stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
          setStickIfOpen(false);
        });
      }

      if (nextOpen) {
        setValue(untrack(itemValue), eventDetails);
      } else {
        setValue(null, eventDetails);
        setPointerType('');
      }
    }

    if (isHover) {
      // Port note: `ReactDOM.flushSync(changeState)`.
      changeState();
      flush();
    } else {
      changeState();
    }
  }

  const context = useFloatingRootContext({
    get open() {
      return open();
    },
    onOpenChange: handleOpenChange,
    elements: {
      get reference() {
        return triggerElement();
      },
      get floating() {
        return hoverFloatingElement();
      },
    },
  });

  const hoverInteractionState = useHoverInteractionSharedState(context);
  const shouldBlockSafePolygonPointerEvents = () => pointerType() !== 'touch';

  useEffect(
    ([isOpen]) => {
      if (!isOpen) {
        context.context.dataRef.current.openEvent = undefined;
        hoverInteractionState.pointerType = undefined;
        hoverInteractionState.interactedInside = false;
        hoverInteractionState.restTimeoutPending = false;
        hoverInteractionState.openChangeTimeout.clear();
        hoverInteractionState.restTimeout.clear();
      }

      return () => {
        clearSafePolygonPointerEventsMutation(hoverInteractionState);
      };
    },
    () => [open()],
  );

  const getInlineHandleCloseContext = () => {
    const hoverFloating = untrack(hoverFloatingElement);
    if (!nested || untrack(positionerElement) || !triggerElementRef.current || !hoverFloating) {
      return null;
    }

    return getHandleCloseContext(triggerElementRef.current, hoverFloating, nodeId);
  };

  function getScope() {
    if (nested && untrack(positionerElement)) {
      return null;
    }

    return closest(triggerElementRef.current, 'ul');
  }

  // Port note: upstream creates the handler on every render; it's recreated when its options
  // change.
  const handleClose = createMemo(() =>
    safePolygon({
      blockPointerEvents: shouldBlockSafePolygonPointerEvents(),
      getScope,
    }),
  );

  const hoverProps = useHoverReferenceInteraction(context, {
    get enabled() {
      return hoverInteractionsEnabled();
    },
    move: false,
    get handleClose() {
      return handleClose();
    },
    get restMs() {
      return mounted() && positionerElement() ? 0 : delay();
    },
    get delay() {
      return { close: closeDelay() };
    },
    triggerElementRef,
    getHandleCloseContext: getInlineHandleCloseContext,
  });

  // Port note: handleActivation flushes before the merged click interaction runs. React
  // keeps the pre-activation toggle option for that event; preserve it in Solid too.
  let clickToggleOverride: boolean | undefined;
  const click = useClick(context, {
    get enabled() {
      return interactionsEnabled();
    },
    get stickIfOpen() {
      return stickIfOpen();
    },
    get toggle() {
      return clickToggleOverride ?? isActiveItem();
    },
  });
  const referenceProps = () => mergeProps(click.reference, hoverProps());

  useIsoLayoutEffect(
    ([isActive, trigger]) => {
      if (isActive) {
        setFloatingRootContext(context);
        prevTriggerElementRef.current = trigger;
      }
    },
    () => [isActiveItem(), triggerElement()],
  );

  function handleActivation(event: MouseEvent | KeyboardEvent) {
    // Port note: `ReactDOM.flushSync(() => { … })`.
    (() => {
      const currentTarget = event.currentTarget as HTMLElement;
      const prevTriggerRect = prevTriggerElementRef.current?.getBoundingClientRect();
      const trigger = untrack(triggerElement);
      const currentValue = untrack(value);
      const hoverFloating = untrack(hoverFloatingElement);

      if (untrack(mounted) && prevTriggerRect && trigger) {
        const nextTriggerRect = trigger.getBoundingClientRect();
        const isMovingRight = nextTriggerRect.left > prevTriggerRect.left;
        const isMovingDown = nextTriggerRect.top > prevTriggerRect.top;

        if (
          untrack(orientation) === 'horizontal' &&
          nextTriggerRect.left !== prevTriggerRect.left
        ) {
          setActivationDirection(isMovingRight ? 'right' : 'left');
        } else if (
          untrack(orientation) === 'vertical' &&
          nextTriggerRect.top !== prevTriggerRect.top
        ) {
          setActivationDirection(isMovingDown ? 'down' : 'up');
        }
      }

      // Reset the `openEvent` to `undefined` when the active item changes so that a
      // `click` -> `hover` on new trigger -> `hover` back to old trigger doesn't unexpectedly
      // cause the popup to remain stuck open when leaving the old trigger.
      if (event.type !== 'click' && currentValue != null) {
        context.context.dataRef.current.openEvent = undefined;
      }

      if (untrack(pointerType) === 'touch' && event.type !== 'click') {
        return;
      }

      // Keyboard open events reach this activation path after `onKeyDown` has already set
      // the value with the `listNavigation` reason.
      if (currentValue != null && event.type !== 'keydown') {
        setValue(
          untrack(itemValue),
          createChangeEventDetails(
            event.type === 'mouseenter' ? REASONS.triggerHover : REASONS.triggerPress,
            event,
          ),
        );
      }

      if (
        event.type === 'mouseenter' &&
        untrack(shouldBlockSafePolygonPointerEvents) &&
        (!nested || !untrack(positionerElement)) &&
        hoverFloating
      ) {
        const applyPointerEventsMutation = () => {
          const scopeElement = getScope() ?? currentTarget.ownerDocument.body;

          applySafePolygonPointerEventsMutation(hoverInteractionState, {
            scopeElement,
            referenceElement: currentTarget,
            floatingElement: hoverFloating,
          });
        };

        if (currentValue != null && currentValue !== untrack(itemValue)) {
          queueMicrotask(applyPointerEventsMutation);
        } else {
          applyPointerEventsMutation();
        }
      }
    })();
    flush();
  }

  const handleOpenEvent = (event: MouseEvent | KeyboardEvent) => {
    if (event.type === 'click') {
      clickToggleOverride = untrack(isActiveItem);
      queueMicrotask(() => {
        clickToggleOverride = undefined;
      });
    }
    if (untrack(disabled)) {
      return;
    }

    const popup = untrack(popupElement);
    const positioner = untrack(positionerElement);

    if (!popup || !positioner) {
      handleActivation(event);
      return;
    }

    const { width, height } = getCssDimensions(popup);
    const currentValue = untrack(value);
    const shouldSkipAutoSizeSync =
      currentValue != null &&
      currentValue !== untrack(itemValue) &&
      (event.type === 'click' || untrack(pointerType) !== 'touch');

    handleActivation(event);

    if (shouldSkipAutoSizeSync) {
      skipAutoSizeSync = true;
    }

    handleValueChange(popup, positioner, width, height);
  };

  const state = createMemo<NavigationMenuTriggerState>(() => ({
    open: isActiveItem(),
    disabled: disabled(),
  }));

  function handleSetPointerType(event: PointerEvent) {
    setPointerType(event.pointerType as 'mouse' | 'touch' | 'pen' | '');
  }

  function handleTriggerPointerDown(event: PointerEvent) {
    handleSetPointerType(event);
    clearSafePolygonPointerEventsMutation(hoverInteractionState);
  }

  // Port note: React's `onFocus`/`onBlur` become `onFocusIn`/`onFocusOut`.
  const defaultProps = () => ({
    tabindex: 0,
    onMouseEnter: handleOpenEvent,
    onClick: handleOpenEvent,
    onPointerEnter: handleSetPointerType,
    onPointerDown: handleTriggerPointerDown,
    'aria-expanded': isActiveItem(),
    'aria-controls': isActiveItem() ? popupElement()?.id : undefined,
    [NAVIGATION_MENU_TRIGGER_IDENTIFIER as string]: '',
    onFocusIn() {
      if (!untrack(isActiveItem)) {
        return;
      }
      setViewportInert(false);
    },
    onMouseLeave() {
      if (untrack(value) == null) {
        clearSafePolygonPointerEventsMutation(hoverInteractionState);
      }
    },
    onKeyDown(event: KeyboardEvent) {
      // For nested (submenu) triggers, don't intercept arrow keys that are used for
      // navigation in the parent content. The arrow keys should be handled by the
      // parent's CompositeRoot for navigating between items.
      if (nested) {
        return;
      }

      const verticalOpenKey = untrack(direction) === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const openHorizontal = untrack(orientation) === 'horizontal' && event.key === 'ArrowDown';
      const openVertical = untrack(orientation) === 'vertical' && event.key === verticalOpenKey;

      if (openHorizontal || openVertical) {
        setValue(untrack(itemValue), createChangeEventDetails(REASONS.listNavigation, event));
        handleOpenEvent(event);
        stopEvent(event);
      }
    },
    onFocusOut(event: FocusEvent) {
      const positioner = untrack(positionerElement);
      const popup = untrack(popupElement);
      if (
        positioner &&
        popup &&
        isOutsideMenuEvent(
          {
            currentTarget: event.currentTarget as HTMLElement | null,
            relatedTarget: event.relatedTarget as HTMLElement | null,
          },
          { popupElement: popup, rootRef, tree, nodeId },
        )
      ) {
        setValue(null, createChangeEventDetails(REASONS.focusOut, event));
      }
    },
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: () => true,
    native: nativeButton,
  });

  const referenceElement = hoverFloatingElement;

  return (
    <>
      <CompositeItem
        tag="button"
        render={componentProps.render}
        class={componentProps.class}
        style={componentProps.style}
        state={state()}
        stateAttributesMapping={pressableTriggerOpenStateMapping}
        refs={[handleTriggerElement, buttonRef]}
        props={[
          referenceProps(),
          dismissProps?.()?.reference || EMPTY_OBJECT,
          defaultProps(),
          elementProps,
          getButtonProps,
        ]}
      />
      <Show when={isActiveItem()}>
        {(_) => {
          const beforeOutsideGuardRef = useGuardRef(beforeOutsideRef);
          const afterOutsideGuardRef = useGuardRef(afterOutsideRef);
          return (
            <>
              <FocusGuard
                ref={beforeOutsideGuardRef}
                onFocusIn={(event) => {
                  const reference = referenceElement();
                  if (reference && isOutsideEvent(event, reference)) {
                    beforeInsideRef.current?.focus();
                  } else {
                    const prevTabbable = getPreviousTabbable(triggerElement());
                    prevTabbable?.focus();
                  }
                }}
              />
              <span aria-owns={viewportElement()?.id} style={ownerVisuallyHidden} />
              <FocusGuard
                ref={afterOutsideGuardRef}
                onFocusIn={(event) => {
                  const reference = referenceElement();
                  const trigger = triggerElement();
                  if (reference && isOutsideEvent(event, reference)) {
                    // Port note: `ReactDOM.flushSync(() => setViewportInert(false))`.
                    setViewportInert(false);
                    flush();
                    const elementToFocus = afterInsideRef.current || trigger;
                    elementToFocus?.focus();
                  } else {
                    let nextTabbable = getNextTabbable(trigger);

                    if (
                      nested &&
                      !positionerElement() &&
                      reference &&
                      nextTabbable &&
                      contains(reference, nextTabbable)
                    ) {
                      nextTabbable = getTabbableNearElement(afterInsideRef.current, 1);
                    }

                    nextTabbable?.focus();

                    if (
                      (!nested || positionerElement()) &&
                      !contains(rootRef.current, nextTabbable)
                    ) {
                      setValue(null, createChangeEventDetails(REASONS.focusOut, event));
                    }
                  }
                }}
              />
            </>
          );
        }}
      </Show>
    </>
  );
}

/**
 * Port note: returns a ref callback that assigns `refObject`, and resets it when the current owner
 * is disposed (React calls refs with `null` on unmount).
 */
function useGuardRef(refObject: RefObject<HTMLSpanElement | null>) {
  let element: HTMLSpanElement | null = null;
  onCleanup(() => {
    if (refObject.current === element) {
      refObject.current = null;
    }
  });
  return (node: HTMLSpanElement) => {
    element = node;
    refObject.current = node;
  };
}

export interface NavigationMenuTriggerState {
  /**
   * If `true`, the popup is open and the item is active.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface NavigationMenuTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NavigationMenuTriggerState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace NavigationMenuTrigger {
  export type State = NavigationMenuTriggerState;
  export type Props = NavigationMenuTriggerProps;
}

function getPlacementFromElements(
  domReferenceElement: Element,
  floatingElement: HTMLElement,
): HandleCloseContextBase['placement'] {
  const referenceRect = domReferenceElement.getBoundingClientRect();
  const floatingRect = floatingElement.getBoundingClientRect();
  const referenceCenterX = referenceRect.left + referenceRect.width / 2;
  const referenceCenterY = referenceRect.top + referenceRect.height / 2;
  const floatingCenterX = floatingRect.left + floatingRect.width / 2;
  const floatingCenterY = floatingRect.top + floatingRect.height / 2;
  const deltaX = floatingCenterX - referenceCenterX;
  const deltaY = floatingCenterY - referenceCenterY;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0 ? 'right' : 'left';
  }

  return deltaY >= 0 ? 'bottom' : 'top';
}

function getHandleCloseContext(
  domReferenceElement: Element,
  floatingElement: HTMLElement,
  nodeId: string | undefined,
): HandleCloseContextBase {
  return {
    placement: getPlacementFromElements(domReferenceElement, floatingElement),
    elements: {
      domReference: domReferenceElement,
      floating: floatingElement,
    },
    nodeId,
  };
}
