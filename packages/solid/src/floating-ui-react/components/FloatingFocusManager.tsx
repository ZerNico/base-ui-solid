import { createMemo, onCleanup, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { getNodeName, isHTMLElement } from '@floating-ui/utils/dom';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { platform } from '@base-ui-solid/utils/platform';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { ownerDocument, ownerWindow } from '@base-ui-solid/utils/owner';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { FocusGuard } from '../../utils/FocusGuard';
import {
  activeElement,
  closest,
  contains,
  getTarget,
  isTypeableCombobox,
  getFloatingFocusElement,
  isTypeableElement,
} from '../utils/element';
import { isVirtualClick, isVirtualPointerEvent, stopEvent } from '../utils/event';
import {
  tabbable,
  focusable,
  isOutsideEvent,
  isTabbable,
  getNextTabbable,
  getPreviousTabbable,
} from '../utils/tabbable';
import type { FocusableElement } from '../utils/tabbable';
import { getNodeAncestors, getNodeChildren } from '../utils/nodes';
import { isElementVisible } from '../utils/composite';
import type { FloatingRootContext } from '../types';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { createAttribute } from '../utils/createAttribute';
import { enqueueFocus } from '../utils/enqueueFocus';
import { markOthers } from '../utils/markOthers';
import { usePortalContext } from './FloatingPortal';
import { useFloatingTree } from './FloatingTree';
import type { FloatingTreeStore } from '../components/FloatingTreeStore';
import { CLICK_TRIGGER_IDENTIFIER } from '../../internals/constants';
import type { FloatingUIOpenChangeDetails } from '../../internals/types';
import { resolveRef } from '../../utils/resolveRef';

function getEventType(event: Event, lastInteractionType?: InteractionType): InteractionType {
  const win = ownerWindow(getTarget(event) as Element | null);
  if (event instanceof win.KeyboardEvent) {
    return 'keyboard';
  }
  if (event instanceof win.FocusEvent) {
    // Focus events can be caused by a preceding pointer interaction (e.g., focusout on outside press).
    // Prefer the last known pointer type if provided, else treat as keyboard.
    return lastInteractionType || 'keyboard';
  }
  if ('pointerType' in event) {
    // A trusted click without a pointerType is keyboard/AT; only synthesized
    // clicks (e.g. a test harness) pair an empty pointerType with a click count.
    return (
      (event.pointerType as InteractionType) ||
      (isVirtualClick(event as PointerEvent) ? 'keyboard' : lastInteractionType || 'mouse')
    );
  }
  if ('touches' in event) {
    return 'touch';
  }
  if (event instanceof win.MouseEvent) {
    // onClick events may not contain pointer events, and will fall through to here
    return lastInteractionType || (event.detail === 0 ? 'keyboard' : 'mouse');
  }
  return '';
}

const LIST_LIMIT = 20;
let previouslyFocusedElements: WeakRef<Element>[] = [];

function clearDisconnectedPreviouslyFocusedElements() {
  previouslyFocusedElements = previouslyFocusedElements.filter((entry) => {
    return entry.deref()?.isConnected;
  });
}

function addPreviouslyFocusedElement(element: Element | null | undefined) {
  clearDisconnectedPreviouslyFocusedElements();
  if (element && getNodeName(element) !== 'body') {
    previouslyFocusedElements.push(new WeakRef(element));
    if (previouslyFocusedElements.length > LIST_LIMIT) {
      previouslyFocusedElements = previouslyFocusedElements.slice(-LIST_LIMIT);
    }
  }
}

function getPreviouslyFocusedElement() {
  clearDisconnectedPreviouslyFocusedElements();
  return previouslyFocusedElements[previouslyFocusedElements.length - 1]?.deref();
}

function getFirstTabbableElement(container: Element | null) {
  if (!container) {
    return null;
  }

  if (isTabbable(container)) {
    return container;
  }

  return tabbable(container)[0] || container;
}

function handleTabIndex(floatingFocusElement: HTMLElement) {
  if (
    floatingFocusElement.hasAttribute('tabindex') &&
    !floatingFocusElement.hasAttribute('data-tabindex')
  ) {
    return;
  }

  if (!floatingFocusElement.getAttribute('role')?.includes('dialog')) {
    return;
  }

  const focusableElements = focusable(floatingFocusElement);
  const tabbableContent = focusableElements.filter((element) => {
    const dataTabIndex = element.getAttribute('data-tabindex') || '';
    return (
      isTabbable(element) ||
      (element.hasAttribute('data-tabindex') && !dataTabIndex.startsWith('-'))
    );
  });
  const tabIndex = floatingFocusElement.getAttribute('tabindex');

  if (tabbableContent.length === 0) {
    if (tabIndex !== '0') {
      floatingFocusElement.setAttribute('tabindex', '0');
      // Mark our own write so the externally-managed early-return above doesn't
      // mistake it for a user-authored `tabindex` and freeze management.
      floatingFocusElement.setAttribute('data-tabindex', '0');
    }
  } else if (
    tabIndex !== '-1' ||
    (floatingFocusElement.hasAttribute('data-tabindex') &&
      floatingFocusElement.getAttribute('data-tabindex') !== '-1')
  ) {
    floatingFocusElement.setAttribute('tabindex', '-1');
    floatingFocusElement.setAttribute('data-tabindex', '-1');
  }
}

/**
 * Port note: read like Solid props (`props.x`), so the props may change over time. `context` and
 * `externalTree` are read once.
 */
export interface FloatingFocusManagerProps {
  children: JSX.Element;
  /**
   * The floating context returned from `useFloatingRootContext`.
   */
  context: FloatingRootContext;
  /**
   * The interaction type used to open the floating element.
   */
  openInteractionType?: InteractionType | null | undefined;
  /**
   * Whether or not the focus manager should be disabled. Useful to delay focus
   * management until after a transition completes or some other conditional
   * state.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Determines the element to focus when the floating element is opened.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (first tabbable element or floating element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use default behavior, `null` to fallback to default behavior,
   *   or `false`/`undefined` to do nothing.
   * @default true
   */
  initialFocus?:
    | boolean
    | RefObject<HTMLElement | null>
    | ((openType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines the element to focus when the floating element is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (reference or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, `null` to fallback to default behavior,
   *   or `false`/`undefined` to do nothing.
   * @default true
   */
  returnFocus?:
    | boolean
    | RefObject<HTMLElement | null>
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Whether `returnFocus` is an explicit consumer target. Internal dynamic defaults use `false`
   * so focus that has already moved outside the floating tree is respected.
   * @internal
   */
  explicitReturnFocus?: boolean | undefined;
  /**
   * Determines where focus should be restored if focus inside the floating element is lost
   * (such as due to the removal of the currently focused element from the DOM).
   *
   * - `true`: restore to the nearest tabbable element inside the floating tree (previous
   *   tabbable if possible, otherwise the last tabbable, then the floating element itself)
   * - `'popup'`: restore directly to the floating element (container) itself
   * - `false`: do not restore focus
   * @default false
   */
  restoreFocus?: boolean | 'popup' | undefined;
  /**
   * Determines if focus is “modal”, meaning focus is fully trapped inside the
   * floating element and outside content cannot be accessed. This includes
   * screen reader virtual cursors.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Determines whether `focusout` event listeners that control whether the
   * floating element should be closed if the focus moves outside of it are
   * attached to the reference and floating elements. This affects non-modal
   * focus management.
   * @default true
   */
  closeOnFocusOut?: boolean | undefined;
  /**
   * Overrides the element to focus when tabbing forward out of the floating element.
   */
  nextFocusableElement?: HTMLElement | RefObject<HTMLElement | null> | null | undefined;
  /**
   * Overrides the element to focus when tabbing backward out of the floating element.
   */
  previousFocusableElement?: HTMLElement | RefObject<HTMLElement | null> | null | undefined;
  /**
   * Ref to the focus guard preceding the floating element content.
   * Can be useful to focus the popup programmatically.
   */
  beforeContentFocusGuardRef?: RefObject<HTMLSpanElement | null> | undefined;
  /**
   * External FloatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Additional elements that should be treated as part of the floating subtree
   * even if they are rendered outside the floating element itself.
   */
  getInsideElements?: (() => Array<Element | null | undefined>) | undefined;
}

/**
 * Provides focus management for the floating element.
 * @see https://floating-ui.com/docs/FloatingFocusManager
 * @internal
 */
export function FloatingFocusManager(props: FloatingFocusManagerProps): JSX.Element {
  const store = untrack(() => props.context);
  const disabled = () => props.disabled ?? false;
  const initialFocus = () => (props.initialFocus === undefined ? true : props.initialFocus);
  const returnFocus = () => (props.returnFocus === undefined ? true : props.returnFocus);
  const restoreFocus = () => props.restoreFocus ?? false;
  const modal = () => props.modal ?? true;
  const closeOnFocusOut = () => props.closeOnFocusOut ?? true;
  const openInteractionType = () =>
    props.openInteractionType === undefined ? '' : props.openInteractionType;
  const nextFocusableElement = () => props.nextFocusableElement;
  const previousFocusableElement = () => props.previousFocusableElement;

  const open = store.useState('open');
  const domReference = store.useState('domReferenceElement');
  const floating = store.useState('floatingElement');

  const { events, dataRef } = store.context;

  const getNodeId = () => dataRef.current.floatingContext?.nodeId;

  const ignoreInitialFocus = () => initialFocus() === false;
  // A typeable combobox reference (e.g. input/textarea) with `initialFocus={false}`
  // has different focus semantics: focus is not trapped inside the floating element,
  // so in the modal case the guards are not rendered, but `aria-hidden` is still
  // applied to the outside nodes.
  const isUntrappedTypeableCombobox = createMemo(
    () => isTypeableCombobox(domReference()) && ignoreInitialFocus(),
  );

  // Port note: upstream's `useValueAsRef` refs for the props are replaced by reading the props
  // lazily. `open` keeps a ref updated in an effect, like upstream, so focus callbacks queued
  // by an earlier open session see the committed state.
  const openRef = { current: untrack(open) };
  useIsoLayoutEffect(
    ([openValue]) => {
      openRef.current = openValue;
    },
    () => [open()],
  );

  const tree = useFloatingTree(untrack(() => props.externalTree));
  const portalContext = usePortalContext();
  // Port note: the portal context value is a stable object whose `portalNode` is a getter, so
  // the effects that depend on upstream's (per-`portalNode`) context value depend on this.
  const portalNode = () => portalContext?.portalNode;

  let preventReturnFocus = false;
  let isPointerDown = false;
  let pointerDownOutside = false;
  let lastFocusedTabbable: FocusableElement | null = null;
  let closeType: InteractionType = '';
  let lastInteractionType: InteractionType = '';

  let beforeGuard: HTMLSpanElement | null = null;
  let afterGuard: HTMLSpanElement | null = null;

  const mergedBeforeGuardRef = (element: HTMLSpanElement | null) => {
    beforeGuard = element;
    const beforeContentFocusGuardRef = props.beforeContentFocusGuardRef;
    if (beforeContentFocusGuardRef) {
      beforeContentFocusGuardRef.current = element;
    }
    if (portalContext) {
      portalContext.beforeInsideRef.current = element;
    }
  };
  const mergedAfterGuardRef = (element: HTMLSpanElement | null) => {
    afterGuard = element;
    if (portalContext) {
      portalContext.afterInsideRef.current = element;
    }
  };

  const blurTimeout = useTimeout();
  const pointerDownTimeout = useTimeout();
  const restoreFocusFrame = useAnimationFrame();

  const isInsidePortal = portalContext != null;
  const floatingFocusElement = createMemo(() => getFloatingFocusElement(floating()));

  const getTabbableContent = (container: Element | null = floatingFocusElement()) => {
    return container ? tabbable(container) : [];
  };

  const getResolvedInsideElements = () =>
    props.getInsideElements?.().filter((element): element is Element => element != null) ?? [];

  // Prevent Tab from escaping the modal when there are no tabbable elements.
  useEffect(
    ([disabledValue, floatingFocusElementValue, modalValue, isUntrapped]) => {
      if (disabledValue || !modalValue) {
        return undefined;
      }

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Tab') {
          // The focus guards have nothing to focus, so we need to stop the event.
          if (
            contains(
              floatingFocusElementValue,
              activeElement(ownerDocument(floatingFocusElementValue)),
            ) &&
            getTabbableContent().length === 0 &&
            !isUntrapped
          ) {
            stopEvent(event);
          }
        }
      }

      const doc = ownerDocument(floatingFocusElementValue);
      return addEventListener(doc, 'keydown', onKeyDown);
    },
    () => [disabled(), floatingFocusElement(), modal(), isUntrappedTypeableCombobox()],
  );

  // Track pointer/keyboard interactions to disambiguate focus and outside presses.
  useEffect(
    ([disabledValue, floatingValue, domReferenceValue, floatingFocusElementValue, openValue]) => {
      if (disabledValue || !openValue) {
        return undefined;
      }

      const doc = ownerDocument(floatingFocusElementValue);

      function clearPointerDownOutside() {
        pointerDownOutside = false;
      }

      function onPointerDown(event: PointerEvent) {
        const target = getTarget(event) as Element | null;
        const insideElements = getResolvedInsideElements();
        const pointerTargetInside =
          contains(floatingValue, target) ||
          contains(domReferenceValue, target) ||
          contains(portalContext?.portalNode, target) ||
          insideElements.some((element) => element === target || contains(element, target));
        pointerDownOutside = !pointerTargetInside;
        lastInteractionType = (event.pointerType as InteractionType) || 'keyboard';

        if (closest(target, `[${CLICK_TRIGGER_IDENTIFIER}]`)) {
          isPointerDown = true;
          // Reset on the next tick so a single click on a click-trigger doesn't
          // permanently suppress focus-out closing for the lifetime of the instance.
          pointerDownTimeout.start(0, () => {
            isPointerDown = false;
          });
        }
      }

      function onKeyDown() {
        lastInteractionType = 'keyboard';
      }

      return mergeCleanups(
        addEventListener(doc, 'pointerdown', onPointerDown, true),
        addEventListener(doc, 'pointerup', clearPointerDownOutside, true),
        addEventListener(doc, 'pointercancel', clearPointerDownOutside, true),
        addEventListener(doc, 'keydown', onKeyDown, true),
        // Avoid a stale `true` leaking into the next open (e.g. keep-mounted popups)
        // if the popup dismissed between pointerdown and pointerup.
        clearPointerDownOutside,
      );
    },
    () => [disabled(), floating(), domReference(), floatingFocusElement(), open(), portalNode()],
  );

  // Close on focus out and restore focus within the floating tree when needed.
  useEffect(
    ([
      disabledValue,
      domReferenceValue,
      floatingValue,
      floatingFocusElementValue,
      modalValue,
      ,
      closeOnFocusOutValue,
      restoreFocusValue,
      isUntrapped,
      nextFocusableElementValue,
      previousFocusableElementValue,
    ]) => {
      if (disabledValue || !closeOnFocusOutValue) {
        return undefined;
      }

      const doc = ownerDocument(floatingFocusElementValue);

      // In Safari, buttons lose focus when pressing them.
      function handlePointerDown() {
        isPointerDown = true;
        pointerDownTimeout.start(0, () => {
          isPointerDown = false;
        });
      }

      function handleFocusIn(event: FocusEvent) {
        const target = getTarget(event) as FocusableElement | null;
        if (isTabbable(target)) {
          lastFocusedTabbable = target;
        }
      }

      function handleFocusOutside(event: FocusEvent) {
        const relatedTarget = event.relatedTarget as HTMLElement | null;
        const currentTarget = event.currentTarget;
        const target = getTarget(event) as HTMLElement | null;

        // When focus is lost to the body (e.g. on a backdrop press), record the element that
        // had focus so a confirmation dialog opened while the body is focused can return focus
        // to it. Scoped to `modal` to avoid non-modal popups polluting the shared stack.
        if (
          modalValue &&
          relatedTarget == null &&
          target != null &&
          contains(floatingValue, target)
        ) {
          addPreviouslyFocusedElement(target);
        }

        queueMicrotask(() => {
          const nodeId = getNodeId();
          const triggers = store.context.triggerElements;
          const insideElements = getResolvedInsideElements();
          const isRelatedFocusGuard =
            relatedTarget?.hasAttribute(createAttribute('focus-guard')) &&
            [
              beforeGuard,
              afterGuard,
              portalContext?.beforeInsideRef.current,
              portalContext?.afterInsideRef.current,
              portalContext?.beforeOutsideRef.current,
              portalContext?.afterOutsideRef.current,
              resolveRef(previousFocusableElementValue),
              resolveRef(nextFocusableElementValue),
            ].includes(relatedTarget);

          const movedToUnrelatedNode = !(
            contains(domReferenceValue, relatedTarget) ||
            contains(floatingValue, relatedTarget) ||
            contains(relatedTarget, floatingValue) ||
            contains(portalContext?.portalNode, relatedTarget) ||
            insideElements.some(
              (element) => element === relatedTarget || contains(element, relatedTarget),
            ) ||
            triggers.hasMatchingElement((trigger) => contains(trigger, relatedTarget)) ||
            isRelatedFocusGuard ||
            (tree &&
              (getNodeChildren(tree.nodesRef.current, nodeId).find(
                (node) =>
                  contains(node.context?.elements.floating, relatedTarget) ||
                  contains(node.context?.elements.domReference, relatedTarget),
              ) ||
                getNodeAncestors(tree.nodesRef.current, nodeId).find(
                  (node) =>
                    [
                      node.context?.elements.floating,
                      getFloatingFocusElement(node.context?.elements.floating),
                    ].includes(relatedTarget) ||
                    node.context?.elements.domReference === relatedTarget,
                )))
          );

          if (currentTarget === domReferenceValue && floatingFocusElementValue) {
            handleTabIndex(floatingFocusElementValue);
          }

          // Restore focus to the previously focused tabbable element to prevent
          // focus from being lost outside the floating tree.
          if (
            restoreFocusValue &&
            currentTarget !== domReferenceValue &&
            !isElementVisible(target) &&
            activeElement(doc) === doc.body
          ) {
            // Let `FloatingPortal` effect knows that focus is still inside the
            // floating tree.
            if (isHTMLElement(floatingFocusElementValue)) {
              floatingFocusElementValue.focus();
              // If explicitly requested to restore focus to the popup container, do not search
              // for the next/previous tabbable element.
              if (restoreFocusValue === 'popup') {
                // If the focused element is removed on pointerdown, the browser
                // tries to move focus to it right after the `.focus()` call above,
                // but because it's removed in the same tick, focus is lost instead.
                // Re-focusing asynchronously (next frame) wins that race.
                restoreFocusFrame.request(() => {
                  floatingFocusElementValue.focus();
                });
                return;
              }
            }

            const tabbableContent = getTabbableContent(
              floatingFocusElementValue,
            ) as Array<Element | null>;
            const prevTabbable = lastFocusedTabbable;
            const nodeToFocus =
              (prevTabbable && tabbableContent.includes(prevTabbable) ? prevTabbable : null) ||
              tabbableContent[tabbableContent.length - 1] ||
              floatingFocusElementValue;

            if (isHTMLElement(nodeToFocus)) {
              nodeToFocus.focus();
            }
          }

          // https://github.com/floating-ui/floating-ui/issues/3060
          if (dataRef.current.insideReactTree) {
            dataRef.current.insideReactTree = false;
            return;
          }

          // Focus did not move inside the floating tree, and there are no tabbable
          // portal guards to handle closing.
          if (
            (isUntrapped ? true : !modalValue) &&
            relatedTarget &&
            movedToUnrelatedNode &&
            !isPointerDown &&
            // Fix React 18 Strict Mode returnFocus due to double rendering.
            // For an "untrapped" typeable combobox (input role=combobox with
            // initialFocus=false), re-opening the popup and tabbing out should still close it even
            // when the previously focused element (e.g. the next tabbable outside the popup) is
            // focused again. Otherwise, the popup remains open on the second Tab sequence:
            // click input -> Tab (closes) -> click input -> Tab.
            // Allow closing when `isUntrappedTypeableCombobox` regardless of the previously focused element.
            (isUntrapped || relatedTarget !== getPreviouslyFocusedElement())
          ) {
            preventReturnFocus = true;
            store.setOpen(false, createChangeEventDetails(REASONS.focusOut, event));
          }
        });
      }

      function markInsideReactTree() {
        if (pointerDownOutside) {
          return;
        }
        dataRef.current.insideReactTree = true;
        blurTimeout.start(0, () => {
          dataRef.current.insideReactTree = false;
        });
      }

      const domReferenceElement = isHTMLElement(domReferenceValue) ? domReferenceValue : null;
      if (!floatingValue && !domReferenceElement) {
        return undefined;
      }

      return mergeCleanups(
        domReferenceElement &&
          addEventListener(domReferenceElement, 'focusout', handleFocusOutside),
        domReferenceElement &&
          addEventListener(domReferenceElement, 'pointerdown', handlePointerDown),
        floatingValue && addEventListener(floatingValue, 'focusin', handleFocusIn),
        floatingValue && addEventListener(floatingValue, 'focusout', handleFocusOutside),
        floatingValue &&
          portalContext &&
          addEventListener(floatingValue, 'focusout', markInsideReactTree, true),
      );
    },
    () => [
      disabled(),
      domReference(),
      floating(),
      floatingFocusElement(),
      modal(),
      portalNode(),
      closeOnFocusOut(),
      restoreFocus(),
      isUntrappedTypeableCombobox(),
      nextFocusableElement(),
      previousFocusableElement(),
    ],
  );

  // Hide everything outside the floating tree from assistive tech while open.
  useEffect(
    ([
      openValue,
      disabledValue,
      domReferenceValue,
      floatingValue,
      modalValue,
      portalNodeValue,
      isUntrapped,
      nextFocusableElementValue,
      previousFocusableElementValue,
    ]) => {
      if (disabledValue || !floatingValue || !openValue) {
        return undefined;
      }

      // Don't hide portals nested within the parent portal.
      const portalNodes = Array.from(
        portalNodeValue?.querySelectorAll(`[${createAttribute('portal')}]`) || [],
      );

      const ancestors = tree ? getNodeAncestors(tree.nodesRef.current, getNodeId()) : [];
      const rootAncestorComboboxDomReference = ancestors.find((node) =>
        isTypeableCombobox(node.context?.elements.domReference || null),
      )?.context?.elements.domReference;

      const controlInsideElements = [
        floatingValue,
        ...portalNodes,
        beforeGuard,
        afterGuard,
        portalContext?.beforeOutsideRef.current,
        portalContext?.afterOutsideRef.current,
        ...getResolvedInsideElements(),
      ];
      const insideElements = [
        ...controlInsideElements,
        rootAncestorComboboxDomReference,
        resolveRef(previousFocusableElementValue),
        resolveRef(nextFocusableElementValue),
        isUntrapped ? domReferenceValue : null,
      ].filter((x): x is Element => x != null);

      const ariaHiddenCleanup = markOthers(insideElements, {
        ariaHidden: modalValue || isUntrapped,
        mark: false,
      });

      const markerInsideElements = [floatingValue, ...portalNodes].filter(
        (x): x is Element => x != null,
      );
      const markerCleanup = markOthers(markerInsideElements);

      return () => {
        markerCleanup();
        ariaHiddenCleanup();
      };
    },
    () => [
      open(),
      disabled(),
      domReference(),
      floating(),
      modal(),
      portalNode(),
      isUntrappedTypeableCombobox(),
      nextFocusableElement(),
      previousFocusableElement(),
    ],
  );

  // Focus the initial element when the floating element opens.
  useIsoLayoutEffect(
    ([disabledValue, openValue, floatingFocusElementValue]) => {
      if (!openValue || disabledValue || !isHTMLElement(floatingFocusElementValue)) {
        return;
      }

      closeType = '';
      lastInteractionType = '';

      const doc = ownerDocument(floatingFocusElementValue);
      const previouslyFocusedElement = activeElement(doc);

      // Wait for any layout effect state setters to execute to set `tabIndex`.
      queueMicrotask(() => {
        const initialFocusValueOrFn = initialFocus();
        const resolvedInitialFocus =
          typeof initialFocusValueOrFn === 'function'
            ? initialFocusValueOrFn(openInteractionType() || '')
            : initialFocusValueOrFn;

        // `null` should fallback to default behavior in case of an empty ref.
        if (resolvedInitialFocus === undefined || resolvedInitialFocus === false) {
          return;
        }

        const focusAlreadyInsideFloatingEl = contains(
          floatingFocusElementValue,
          previouslyFocusedElement,
        );

        if (focusAlreadyInsideFloatingEl) {
          return;
        }

        let focusableElements: Array<FocusableElement> | null = null;
        const getDefaultFocusElement = () => {
          if (focusableElements == null) {
            focusableElements = getTabbableContent(floatingFocusElementValue);
          }

          return focusableElements[0] || floatingFocusElementValue;
        };

        let elToFocus: FocusableElement | null | undefined;
        if (resolvedInitialFocus === true || resolvedInitialFocus === null) {
          elToFocus = getDefaultFocusElement();
        } else {
          elToFocus = resolveRef(resolvedInitialFocus);
        }
        elToFocus = elToFocus || getDefaultFocusElement();

        const hadFocusInside = contains(floatingFocusElementValue, activeElement(doc));

        // Screen readers re-sync focus to their cursor right after a synthesized press. A focus
        // that lands a frame later reads as a stray move and gets pulled back to the reference.
        const openEvent = dataRef.current.openEvent;
        const openedByVirtualPress =
          openEvent?.type === 'mousedown' && isVirtualClick(openEvent as MouseEvent);

        // enqueueFocus returns a rAF-cancel function; we intentionally don't cancel this focus.
        void enqueueFocus(elToFocus, {
          sync: openedByVirtualPress,
          preventScroll: elToFocus === floatingFocusElementValue,
          shouldFocus() {
            // If the floating element has closed before this runs — e.g. tabbing out of a
            // kept-mounted popup — don't pull focus back onto the initial element after it has
            // legitimately moved elsewhere.
            if (!openRef.current) {
              return false;
            }

            if (hadFocusInside) {
              return true;
            }

            const currentActiveElement = activeElement(doc);
            const focusMovedInside =
              currentActiveElement !== elToFocus &&
              contains(floatingFocusElementValue, currentActiveElement);

            return !focusMovedInside;
          },
        });
      });
    },
    () => [disabled(), open(), floatingFocusElement()],
  );

  // A return-focus queued by the effect cleanup. If the effect re-arms in the same commit, a
  // dependency changed while the popup stayed open, so the cleanup was not a close.
  let pendingReturnFocus: { cancelled: boolean } | null = null;

  // Track return focus targets and restore focus on unmount/close.
  useIsoLayoutEffect(
    ([disabledValue, floatingValue, floatingFocusElementValue, domReferenceValue]) => {
      if (disabledValue || !floatingFocusElementValue) {
        pendingReturnFocus = null;
        return undefined;
      }

      if (pendingReturnFocus) {
        pendingReturnFocus.cancelled = true;
        pendingReturnFocus = null;
      }

      const doc = ownerDocument(floatingFocusElementValue);
      const elementFocusedBeforeOpen = activeElement(doc);
      // Only an explicit `null` interaction type represents a programmatic open.
      // `undefined` is normalized to `''` by the prop default, so it never reaches
      // here as nullish and is intentionally not treated as programmatic.
      const preferPreviousFocus = openInteractionType() == null;

      addPreviouslyFocusedElement(elementFocusedBeforeOpen);

      function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
        if (!details.open) {
          closeType = getEventType(details.nativeEvent, lastInteractionType);
        }

        // Focus guards transfer focus themselves; other close handlers may still need return focus.
        if (
          (details.reason === REASONS.focusOut &&
            details.triggerElement?.hasAttribute(createAttribute('focus-guard'))) ||
          (details.reason === REASONS.triggerHover && details.nativeEvent.type === 'mouseleave')
        ) {
          preventReturnFocus = true;
        }

        if (details.reason !== REASONS.outsidePress) {
          return;
        }

        if (details.nested) {
          preventReturnFocus = false;
        } else if (
          isVirtualClick(details.nativeEvent as MouseEvent) ||
          isVirtualPointerEvent(details.nativeEvent as PointerEvent)
        ) {
          preventReturnFocus = false;
        } else {
          // On outside press, only return focus to the reference when the browser supports the
          // `focus({ preventScroll })` option; without it, restoring focus scrolls the page.
          // Chrome on Android and Samsung Internet still don't support `preventScroll`
          // (https://issues.chromium.org/issues/41453122), so the runtime check keeps return
          // focus disabled there to avoid the scroll jump.
          let isPreventScrollSupported = false;
          ownerDocument(floatingFocusElementValue)
            .createElement('div')
            .focus({
              get preventScroll() {
                isPreventScrollSupported = true;
                return false;
              },
            });

          if (isPreventScrollSupported) {
            preventReturnFocus = false;
          } else {
            preventReturnFocus = true;
          }
        }
      }

      events.on('openchange', onOpenChangeLocal);

      function getReturnElement(closeTypeValue: InteractionType) {
        const returnFocusValueOrFn = returnFocus();
        let resolvedReturnFocusValue =
          typeof returnFocusValueOrFn === 'function'
            ? returnFocusValueOrFn(closeTypeValue)
            : returnFocusValueOrFn;

        // `null` should fallback to default behavior in case of an empty ref.
        if (resolvedReturnFocusValue === undefined || resolvedReturnFocusValue === false) {
          return null;
        }

        if (resolvedReturnFocusValue === null) {
          resolvedReturnFocusValue = true;
        }

        const referenceReturnElement = domReferenceValue?.isConnected ? domReferenceValue : null;
        const previousReturnElement =
          elementFocusedBeforeOpen?.isConnected && getNodeName(elementFocusedBeforeOpen) !== 'body'
            ? elementFocusedBeforeOpen
            : null;

        let defaultReturnElement = preferPreviousFocus
          ? previousReturnElement || referenceReturnElement
          : referenceReturnElement || previousReturnElement;

        if (!defaultReturnElement) {
          defaultReturnElement = getPreviouslyFocusedElement() || null;
        }

        if (typeof resolvedReturnFocusValue === 'boolean') {
          return defaultReturnElement;
        }

        return resolveRef(resolvedReturnFocusValue) || defaultReturnElement || null;
      }

      return () => {
        events.off('openchange', onOpenChangeLocal);

        const activeEl = activeElement(doc);
        const insideElements = getResolvedInsideElements();
        const isFocusInsideFloatingTree =
          contains(floatingValue, activeEl) ||
          insideElements.some((element) => element === activeEl || contains(element, activeEl)) ||
          (tree &&
            getNodeChildren(tree.nodesRef.current, getNodeId(), false).some((node) =>
              contains(node.context?.elements.floating, activeEl),
            ));

        const returnFocusValueOrFn = returnFocus();
        const closeTypeValue = closeType;
        const returnElement = getReturnElement(closeTypeValue);

        const job = { cancelled: false };
        pendingReturnFocus = job;

        queueMicrotask(() => {
          if (pendingReturnFocus === job) {
            pendingReturnFocus = null;
          }
          // `returnElement` if it is tabbable, otherwise its first tabbable child,
          // otherwise `returnElement` itself (which may not be tabbable at all).
          const tabbableReturnElement = getFirstTabbableElement(returnElement);
          // Read in the cleanup on purpose: the latest `explicitReturnFocus` decides.
          const hasExplicitReturnFocus =
            props.explicitReturnFocus ?? typeof returnFocusValueOrFn !== 'boolean';

          if (
            !job.cancelled &&
            returnFocusValueOrFn &&
            !preventReturnFocus &&
            isHTMLElement(tabbableReturnElement) &&
            // If the focus moved somewhere else after mount, avoid returning focus
            // since it likely entered a different element which should be
            // respected: https://github.com/floating-ui/floating-ui/issues/2607
            (!hasExplicitReturnFocus && tabbableReturnElement !== activeEl && activeEl !== doc.body
              ? isFocusInsideFloatingTree
              : true)
          ) {
            const focusOptions: FocusOptions = { preventScroll: true };
            if (closeTypeValue === 'keyboard') {
              focusOptions.focusVisible = true;
            }
            tabbableReturnElement.focus(focusOptions);
          }

          // A cancelled return must also clear suppression before the next close.
          preventReturnFocus = false;
        });
      };
    },
    () => [disabled(), floating(), floatingFocusElement(), domReference()],
  );

  // Safari may randomly scroll to the bottom of the page if an input inside a popup has focus
  // when the popup unmounts from the DOM.
  // By blurring it before the popup unmounts, we can prevent this behavior.
  useIsoLayoutEffect(
    ([openValue, floatingValue]) => {
      if (!platform.engine.webkit || openValue || !floatingValue) {
        return;
      }

      const activeEl = activeElement(ownerDocument(floatingValue));
      if (!isHTMLElement(activeEl) || !isTypeableElement(activeEl)) {
        return;
      }

      if (contains(floatingValue, activeEl)) {
        activeEl.blur();
      }
    },
    () => [open(), floating()],
  );

  // Synchronize the focus manager state (modal, closeOnFocusOut, open, etc.) to the
  // FloatingPortal context, which uses it to decide whether to render its own guards.
  useIsoLayoutEffect(
    ([disabledValue, modalValue, openValue, closeOnFocusOutValue, domReferenceValue]) => {
      if (disabledValue || !portalContext) {
        return undefined;
      }

      portalContext.setFocusManagerState({
        modal: modalValue,
        closeOnFocusOut: closeOnFocusOutValue,
        open: openValue,
        onOpenChange: store.setOpen,
        domReference: domReferenceValue,
      });

      return () => {
        portalContext.setFocusManagerState(null);
      };
    },
    () => [disabled(), modal(), open(), closeOnFocusOut(), domReference()],
  );

  // Keep the floating element tabIndex in sync and clear stale focus records.
  useIsoLayoutEffect(
    ([disabledValue, floatingFocusElementValue]) => {
      if (disabledValue || !floatingFocusElementValue) {
        return undefined;
      }
      handleTabIndex(floatingFocusElementValue);
      return () => {
        queueMicrotask(clearDisconnectedPreviouslyFocusedElements);
      };
    },
    () => [disabled(), floatingFocusElement()],
  );

  const shouldRenderGuards = createMemo(
    () =>
      !disabled() &&
      (modal() ? !isUntrappedTypeableCombobox() : true) &&
      (isInsidePortal || modal()),
  );

  return (
    <>
      <Show when={shouldRenderGuards()}>
        <InsideFocusGuard
          setRef={mergedBeforeGuardRef}
          onFocusIn={(event) => {
            if (modal()) {
              const els = getTabbableContent();
              // enqueueFocus returns a rAF-cancel function we don't need here.
              void enqueueFocus(els[els.length - 1]);
            } else if (portalContext?.portalNode) {
              preventReturnFocus = false;
              if (isOutsideEvent(event, portalContext.portalNode)) {
                const nextTabbable = getNextTabbable(domReference());
                nextTabbable?.focus();
              } else {
                resolveRef(previousFocusableElement() ?? portalContext.beforeOutsideRef)?.focus();
              }
            }
          }}
        />
      </Show>
      {props.children}
      <Show when={shouldRenderGuards()}>
        <InsideFocusGuard
          setRef={mergedAfterGuardRef}
          onFocusIn={(event) => {
            if (modal()) {
              // enqueueFocus returns a rAF-cancel function we don't need here.
              void enqueueFocus(getTabbableContent()[0]);
            } else if (portalContext?.portalNode) {
              if (closeOnFocusOut()) {
                preventReturnFocus = true;
              }

              if (isOutsideEvent(event, portalContext.portalNode)) {
                const prevTabbable = getPreviousTabbable(domReference());
                prevTabbable?.focus();
              } else {
                resolveRef(nextFocusableElement() ?? portalContext.afterOutsideRef)?.focus();
              }
            }
          }}
        />
      </Show>
    </>
  );
}

/**
 * Port note: a `FocusGuard` whose ref is called with `null` when it unmounts, like React does.
 */
function InsideFocusGuard(props: {
  setRef: (element: HTMLSpanElement | null) => void;
  onFocusIn: (event: FocusEvent) => void;
}) {
  onCleanup(() => {
    props.setRef(null);
  });
  return (
    <FocusGuard
      data-type="inside"
      ref={(element) => {
        props.setRef(element);
      }}
      onFocusIn={(event) => props.onFocusIn(event)}
    />
  );
}
