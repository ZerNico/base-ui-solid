import { createMemo, untrack } from 'solid-js';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useValueAsRef } from '@base-ui-solid/utils/useValueAsRef';
import { platform } from '@base-ui-solid/utils/platform';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useFloatingParentNodeIdAccessor, useFloatingTree } from '../components/FloatingTree';
import type { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { ElementProps, FloatingRootContext } from '../types';
import {
  getMaxListIndex,
  getMinListIndex,
  getNextListIndex,
  isIndexOutOfListBounds,
} from '../utils/composite';
import type { gridNavigation } from './gridNavigation';
import { ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP } from '../utils/constants';
import {
  activeElement,
  contains,
  getFloatingFocusElement,
  getTarget,
  isTypeableCombobox,
  isTypeableElement,
} from '../utils/element';
import { enqueueFocus } from '../utils/enqueueFocus';
import { isVirtualClick, isVirtualPointerEvent, stopEvent } from '../utils/event';

/**
 * Where a navigation originated. `'imperative'` marks a programmatic
 * `highlightItem()` call so consumers can report it distinctly from keyboard or
 * pointer navigation.
 */
export type ListNavigationSource = 'imperative';

/**
 * The item to highlight, relative to the currently highlighted one (`'next'`,
 * `'previous'`) or to the list itself (`'first'`, `'last'`). `'none'` clears the
 * highlight.
 */
export type HighlightItemTarget = 'next' | 'previous' | 'first' | 'last' | 'none';

export interface UseListNavigationReturn extends ElementProps {
  /**
   * Moves the highlight to `target`. A no-op while the list is closed. In a grid, `'next'` and
   * `'previous'` step through the items in DOM order, like the main-orientation arrow keys.
   */
  highlightItem: (target: HighlightItemTarget) => void;
}

// WebKit fires zero-delta `mousemove`/`pointermove` events when the list scrolls
// beneath a stationary pointer, moving the highlight during keyboard navigation.
// https://github.com/mui/base-ui/issues/4002
function isStationaryWebKitPointer(event: MouseEvent | PointerEvent) {
  return platform.engine.webkit && event.movementX === 0 && event.movementY === 0;
}

function doSwitch(
  orientation: UseListNavigationProps['orientation'],
  vertical: boolean,
  horizontal: boolean,
) {
  switch (orientation) {
    case 'vertical':
      return vertical;
    case 'horizontal':
      return horizontal;
    default:
      return vertical || horizontal;
  }
}

export function isMainOrientationKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
) {
  const vertical = key === ARROW_UP || key === ARROW_DOWN;
  const horizontal = key === ARROW_LEFT || key === ARROW_RIGHT;
  return doSwitch(orientation, vertical, horizontal);
}

export function isMainOrientationToEndKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
) {
  const vertical = key === ARROW_DOWN;
  const horizontal = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  return (
    doSwitch(orientation, vertical, horizontal) || key === 'Enter' || key === ' ' || key === ''
  );
}

export function isCrossOrientationOpenKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
) {
  const vertical = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  const horizontal = key === ARROW_DOWN;
  return doSwitch(orientation, vertical, horizontal);
}

export function isCrossOrientationCloseKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
  grid: boolean,
) {
  const vertical = rtl ? key === ARROW_RIGHT : key === ARROW_LEFT;
  const horizontal = key === ARROW_UP;
  if (orientation === 'both' || (orientation === 'horizontal' && grid)) {
    return key === 'Escape';
  }
  return doSwitch(orientation, vertical, horizontal);
}

/**
 * Port note: read lazily like Solid props (`props.x`), so pass a props-like object with getters
 * for reactive options (e.g. `activeIndex`). `externalTree` is read once.
 */
export interface UseListNavigationProps {
  /**
   * A ref that holds an array of list items.
   * @default empty list
   */
  listRef: RefObject<Array<HTMLElement | null>>;
  /**
   * The index of the currently active (focused or highlighted) item, which may
   * or may not be selected.
   * @default null
   */
  activeIndex: number | null;
  /**
   * A callback that is called when the user navigates to a new active item,
   * passed in a new `activeIndex`.
   */
  onNavigate?:
    | ((
        activeIndex: number | null,
        event: Event | undefined,
        source?: ListNavigationSource | undefined,
      ) => void)
    | undefined;
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The currently selected item index, which may or may not be active.
   * @default null
   */
  selectedIndex?: number | null | undefined;
  /**
   * Whether to focus the item upon opening the floating element. 'auto' infers
   * what to do based on the input type (keyboard vs. pointer), while a boolean
   * value will force the value.
   * @default 'auto'
   */
  focusItemOnOpen?: boolean | 'auto' | undefined;
  /**
   * Whether hovering an item synchronizes the focus.
   * @default true
   */
  focusItemOnHover?: boolean | undefined;
  /**
   * Whether pressing an arrow key on the navigation's main axis opens the
   * floating element.
   * @default true
   */
  openOnArrowKeyDown?: boolean | undefined;
  /**
   * By default elements with either a `disabled` or `aria-disabled` attribute
   * are skipped in the list navigation — however, this requires the items to
   * be rendered.
   * This prop allows you to manually specify indices which should be disabled,
   * overriding the default logic.
   * For Windows-style select popups, where the menu does not open when
   * navigating via arrow keys, specify an empty array.
   * @default undefined
   */
  disabledIndices?: ReadonlyArray<number> | ((index: number) => boolean) | undefined;
  /**
   * Determines whether focus can escape the list, such that nothing is selected
   * after navigating beyond the boundary of the list. In some
   * autocomplete/combobox components, this may be desired, as screen
   * readers will return to the input.
   * `loopFocus` must be `true`.
   * @default false
   */
  allowEscape?: boolean | undefined;
  /**
   * Determines whether focus should loop around when navigating past the first
   * or last item.
   * @default false
   */
  loopFocus?: boolean | undefined;
  /**
   * If the list is nested within another one (e.g. a nested submenu), the
   * navigation semantics change.
   * @default false
   */
  nested?: boolean | undefined;
  /**
   * Allows to specify the orientation of the parent list, which is used to
   * determine the direction of the navigation.
   * This is useful when list navigation is used within a Composite,
   * as the hook can't determine the orientation of the parent list automatically.
   */
  parentOrientation?: UseListNavigationProps['orientation'] | undefined;
  /**
   * Whether the direction of the floating element's navigation is in RTL
   * layout.
   * @default false
   */
  rtl?: boolean | undefined;
  /**
   * Whether the focus is virtual (using `aria-activedescendant`).
   * Use this if you need focus to remain on the reference element
   * (such as an input), but allow arrow keys to navigate list items.
   * This is common in autocomplete listbox components.
   * Your virtually-focused list items must have a unique `id` set on them.
   * @default false
   */
  virtual?: boolean | undefined;
  /**
   * The orientation in which navigation occurs.
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal' | 'both' | undefined;
  /**
   * The orientation used to open the list from its trigger.
   * @default orientation
   */
  triggerOrientation?: 'vertical' | 'horizontal' | 'both' | undefined;
  /**
   * The id of the root component.
   */
  id?: string | undefined;
  /**
   * Whether to clear the active index when the pointer leaves an item.
   * @default true
   */
  resetOnPointerLeave?: boolean | undefined;
  /**
   * External FloatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Focus target used when a nested list returns to a virtually focused parent.
   */
  nestedReturnFocusRef?: RefObject<HTMLElement | null> | undefined;
  /**
   * Computes two-dimensional list navigation for grid-capable consumers.
   */
  grid?: typeof gridNavigation | null | undefined;
}

/**
 * Adds arrow key-based navigation of a list of items, either using real DOM
 * focus or virtual focus.
 * @see https://floating-ui.com/docs/useListNavigation
 */
export function useListNavigation(
  store: FloatingRootContext,
  props: UseListNavigationProps,
): UseListNavigationReturn {
  // Port note: the options are read lazily (see `UseListNavigationProps`).
  const listRef = () => props.listRef;
  const activeIndex = () => props.activeIndex;
  const onNavigateProp = (
    index: number | null,
    event: Event | undefined,
    source?: ListNavigationSource,
  ) => props.onNavigate?.(index, event, source);
  const enabled = () => props.enabled ?? true;
  const selectedIndex = () => props.selectedIndex ?? null;
  const allowEscape = () => props.allowEscape ?? false;
  const loopFocus = () => props.loopFocus ?? false;
  const nested = () => props.nested ?? false;
  const rtl = () => props.rtl ?? false;
  const virtual = () => props.virtual ?? false;
  const focusItemOnOpen = () => props.focusItemOnOpen ?? 'auto';
  const focusItemOnHover = () => props.focusItemOnHover ?? true;
  const openOnArrowKeyDown = () => props.openOnArrowKeyDown ?? true;
  const disabledIndices = () => props.disabledIndices;
  const orientation = () => props.orientation ?? 'vertical';
  const triggerOrientation = () => props.triggerOrientation ?? orientation();
  const parentOrientation = () => props.parentOrientation;
  const id = () => props.id;
  const resetOnPointerLeave = () => props.resetOnPointerLeave ?? true;
  const nestedReturnFocusRef = () => props.nestedReturnFocusRef;
  const navigateGrid = () => props.grid;

  const isGrid = () => navigateGrid() != null;

  if (IS_DEV) {
    // Port note: upstream warns on every render; this warns whenever the options change.
    useIsoLayoutEffect(
      ([allowEscapeValue, loopFocusValue, virtualValue, orientationValue, isGridValue]) => {
        if (allowEscapeValue) {
          if (!loopFocusValue) {
            console.warn('`useListNavigation` looping must be enabled to allow escaping.');
          }

          if (!virtualValue) {
            console.warn('`useListNavigation` must be virtual to allow escaping.');
          }
        }

        if (orientationValue === 'vertical' && isGridValue) {
          console.warn(
            'In grid list navigation mode, the `orientation` should',
            'be either "horizontal" or "both".',
          );
        }
      },
      () => [allowEscape(), loopFocus(), virtual(), orientation(), isGrid()],
    );
  }

  const open = store.useState('open');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');

  const dataRef = store.context.dataRef;

  const floatingFocusElement = createMemo(() => getFloatingFocusElement(floatingElement()));
  const typeableComboboxReference = createMemo(() => isTypeableCombobox(domReferenceElement()));

  const floatingFocusElementRef = useValueAsRef(floatingFocusElement);

  const parentId = useFloatingParentNodeIdAccessor();
  // Port note: React re-reads the external tree after detached trigger registration.
  const contextTree = useFloatingTree();
  const tree = () => props.externalTree ?? contextTree;

  let focusItemOnOpenRef = untrack(focusItemOnOpen);
  let indexRef = untrack(selectedIndex) ?? -1;
  let keyRef: null | string = null;
  let isPointerModalityRef = true;

  const onNavigate = (event?: Event, source?: ListNavigationSource) => {
    onNavigateProp(indexRef === -1 ? null : indexRef, event, source);
  };

  let previousMountedRef = !!untrack(floatingElement);
  let previousOpenRef = untrack(open);
  let forceSyncFocusRef = false;
  let forceScrollIntoViewRef = false;
  let cancelQueuedFocusRef: (() => void) | null = null;

  const disabledIndicesRef = useValueAsRef(disabledIndices);
  const latestOpenRef = useValueAsRef(open);
  const selectedIndexRef = useValueAsRef(selectedIndex);
  const resetOnPointerLeaveRef = useValueAsRef(resetOnPointerLeave);

  const focusFrame = useAnimationFrame();
  const waitForListPopulatedFrame = useAnimationFrame();

  const focusItem = () => {
    // Synchronous navigation must also supersede any deferred focus from an earlier update.
    focusFrame.cancel();

    function runFocus(item: HTMLElement) {
      if (!virtual()) {
        cancelQueuedFocusRef = enqueueFocus(item, {
          sync: forceSyncFocusRef,
          preventScroll: true,
        });
      }
    }

    const initialItem = listRef().current[indexRef];
    const forceScrollIntoView = forceScrollIntoViewRef;

    if (initialItem) {
      runFocus(initialItem);
    }

    const scheduler = forceSyncFocusRef
      ? (callback: () => void) => callback()
      : (callback: () => void) => focusFrame.request(callback);

    scheduler(() => {
      const waitedItem = listRef().current[indexRef] || initialItem;

      if (!waitedItem) {
        return;
      }

      if (!initialItem) {
        runFocus(waitedItem);
      }

      const shouldScrollIntoView =
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        item && (forceScrollIntoView || !isPointerModalityRef);

      if (shouldScrollIntoView) {
        // JSDOM doesn't support `.scrollIntoView()` but it's widely supported
        // by all browsers.
        waitedItem.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }
    });
  };

  useIsoLayoutEffect(
    ([orientationValue]) => {
      dataRef.current.orientation = orientationValue;
    },
    () => [orientation()],
  );

  useIsoLayoutEffect(
    ([openValue, focusItemOnOpenValue]) => {
      if (!openValue) {
        keyRef = null;
      }
      // Explicit values can change with the opening interaction. Keep an inferred 'auto' value
      // from the trigger event, but apply a boolean before the initial highlight is synchronized.
      if (!openValue || focusItemOnOpenValue !== 'auto') {
        focusItemOnOpenRef = focusItemOnOpenValue;
      }
    },
    () => [open(), focusItemOnOpen()],
  );

  // Sync `selectedIndex` to be the `activeIndex` upon opening the floating
  // element. Also, reset `activeIndex` upon closing the floating element.
  useIsoLayoutEffect(
    ([enabledValue, openValue, floatingElementValue, selectedIndexValue]) => {
      if (!enabledValue) {
        return;
      }

      if (openValue && floatingElementValue) {
        indexRef = selectedIndexValue ?? -1;
        if (focusItemOnOpenRef && selectedIndexValue != null) {
          // Regardless of the pointer modality, we want to ensure the selected
          // item comes into view when the floating element is opened.
          forceScrollIntoViewRef = true;
          onNavigate();
        }
      } else if (previousMountedRef) {
        // Reset the active index when the list is no longer open and mounted (closing or
        // unmounting). `onNavigate` is a stable callback that always forwards to the latest
        // `onNavigate` prop.
        indexRef = -1;
        onNavigate();
      }
    },
    () => [enabled(), open(), floatingElement(), selectedIndex()],
  );

  // Sync `activeIndex` to be the focused item while the floating element is
  // open.
  useIsoLayoutEffect(
    ([
      enabledValue,
      openValue,
      floatingElementValue,
      activeIndexValue,
      nestedValue,
      triggerOrientationValue,
      rtlValue,
    ]) => {
      if (!enabledValue) {
        return;
      }
      if (!openValue) {
        forceSyncFocusRef = false;
        return;
      }
      if (!floatingElementValue) {
        return;
      }

      if (activeIndexValue == null) {
        forceSyncFocusRef = false;

        if (selectedIndexRef.current != null) {
          return;
        }

        // Reset while the floating element was open (e.g. the list changed).
        if (previousMountedRef) {
          indexRef = -1;
          focusItem();
        }

        // Initial sync.
        if (
          (!previousOpenRef || !previousMountedRef) &&
          focusItemOnOpenRef &&
          (keyRef != null || (focusItemOnOpenRef === true && keyRef == null))
        ) {
          let runs = 0;
          const waitForListPopulated = () => {
            if (listRef().current[0] == null) {
              // Avoid letting the browser paint if possible on the first try,
              // otherwise use rAF. Don't try more than twice, since something
              // is wrong otherwise.
              if (runs < 2) {
                const scheduler = runs
                  ? (callback: () => void) => waitForListPopulatedFrame.request(callback)
                  : queueMicrotask;
                scheduler(waitForListPopulated);
              }
              runs += 1;
            } else {
              // Initially focus the first non-disabled item. `disabledIndices` is deliberately
              // omitted here so attribute-disabled items (`disabled`/`aria-disabled`) are skipped
              // on open even when the consumer passes an empty `disabledIndices` array. Passing it
              // would regress that behavior (see mui/base-ui#2604).
              // The key came from the trigger, so it is read on the trigger's orientation.
              indexRef =
                keyRef == null ||
                isMainOrientationToEndKey(keyRef, triggerOrientationValue, rtlValue) ||
                nestedValue
                  ? getMinListIndex(listRef())
                  : getMaxListIndex(listRef());
              keyRef = null;
              onNavigate();
            }
          };

          waitForListPopulated();
        }
      } else if (!isIndexOutOfListBounds(listRef().current, activeIndexValue)) {
        indexRef = activeIndexValue;
        focusItem();
        forceScrollIntoViewRef = false;
      } else if (listRef().current.length === 0) {
        // Port note: React runs the items' layout effects (which fill the list) before this one.
        // Solid runs a parent's effects first, so when the floating element is synced in the same
        // update as the items mount, wait for the list like the initial sync above does.
        queueMicrotask(() => {
          if (
            latestOpenRef.current &&
            untrack(activeIndex) === activeIndexValue &&
            !isIndexOutOfListBounds(listRef().current, activeIndexValue)
          ) {
            indexRef = activeIndexValue;
            focusItem();
            forceScrollIntoViewRef = false;
          }
        });
      }
    },
    () => [
      enabled(),
      open(),
      floatingElement(),
      activeIndex(),
      nested(),
      triggerOrientation(),
      rtl(),
      listRef(),
    ],
  );

  // Ensure the parent floating element has focus when a nested child closes
  // to allow arrow key navigation to work after the pointer leaves the child.
  useIsoLayoutEffect(
    ([enabledValue, floatingElementValue, domReferenceElementValue, virtualValue]) => {
      if (!enabledValue || floatingElementValue || !tree() || virtualValue || !previousMountedRef) {
        return;
      }

      const nodes = tree()!.nodesRef.current;
      const parent = nodes.find((node) => node.id === parentId())?.context?.elements.floating;
      // `floatingElement` is null here (see the guard above), so resolve the owner document from an
      // in-DOM element for realm-safety (shadow DOM/iframes): the reference element, falling back to
      // the parent floating element when the reference is virtual (`domReferenceElement` is null).
      const activeEl = activeElement(ownerDocument(domReferenceElementValue ?? parent ?? null));
      const treeContainsActiveEl = nodes.some(
        (node) => node.context && contains(node.context.elements.floating, activeEl),
      );

      if (parent && !treeContainsActiveEl && isPointerModalityRef) {
        parent.focus({ preventScroll: true });
      }
    },
    () => [enabled(), floatingElement(), domReferenceElement(), virtual()],
  );

  // Port note: upstream runs this after every render. The refs only hold `open` and
  // `floatingElement`, so this runs when those change, after the effects above.
  useIsoLayoutEffect(
    ([openValue, floatingElementValue]) => {
      // Port note: Solid orders effects by dependencies, so this bookkeeping effect can run
      // before the navigation effects above. Commit after the current effect flush, matching
      // React's final layout effect and preserving the previous-open snapshot for initial sync.
      queueMicrotask(() => {
        previousOpenRef = openValue;
        previousMountedRef = !!floatingElementValue;
      });
    },
    () => [open(), floatingElement()],
  );

  const hasActiveIndex = () => activeIndex() != null;

  const syncCurrentTarget = (event: Event) => {
    if (!latestOpenRef.current) {
      return;
    }

    const index = listRef().current.indexOf(event.currentTarget as HTMLElement);
    if (index !== -1 && (indexRef !== index || activeIndex() !== index)) {
      indexRef = index;
      onNavigate(event);
    }
  };

  const getParentOrientation = () => {
    return (
      parentOrientation() ??
      (tree()?.nodesRef.current.find((node) => node.id === parentId())?.context?.dataRef?.current
        .orientation as UseListNavigationProps['orientation'])
    );
  };

  const getMinEnabledIndex = () => {
    return getMinListIndex(listRef(), disabledIndicesRef.current);
  };

  const commonOnKeyDown = (event: KeyboardEvent) => {
    isPointerModalityRef = false;
    forceSyncFocusRef = true;

    // When composing a character, Chrome fires ArrowDown twice. Firefox/Safari
    // don't appear to suffer from this. `event.isComposing` is avoided due to
    // Safari not supporting it properly (although it's not needed in the first
    // place for Safari, just avoiding any possible issues).
    if (event.which === 229) {
      return;
    }

    // If the floating element is animating out, ignore navigation. Otherwise,
    // the `activeIndex` gets set to 0 despite not being open so the next time
    // the user ArrowDowns, the first item won't be focused.
    if (!latestOpenRef.current && event.currentTarget === floatingFocusElementRef.current) {
      return;
    }

    const orientationValue = orientation();
    const rtlValue = rtl();
    const loopFocusValue = loopFocus();
    const disabledIndicesValue = disabledIndices();
    const activeIndexValue = activeIndex();

    if (nested() && isCrossOrientationCloseKey(event.key, orientationValue, rtlValue, isGrid())) {
      // If the nested list's close key is also the parent navigation key,
      // let the parent navigate. Otherwise, stop propagating the event.
      if (!isMainOrientationKey(event.key, getParentOrientation())) {
        stopEvent(event);
      }

      store.setOpen(false, createChangeEventDetails(REASONS.listNavigation, event));

      const returnElement = nestedReturnFocusRef()?.current ?? domReferenceElement();
      if (isHTMLElement(returnElement)) {
        returnElement.focus();
      }

      return;
    }

    // The consumer owns `activeIndex` and may decline a navigation this hook proposed, such as a
    // virtual list keeping its highlight when the reference is refocused. Declining produces no
    // re-render, so reconcile here: otherwise the cursor drifts from the rendered highlight and
    // this key moves from the wrong position.
    if (
      activeIndexValue != null &&
      activeIndexValue !== indexRef &&
      !isIndexOutOfListBounds(listRef().current, activeIndexValue)
    ) {
      indexRef = activeIndexValue;
    }

    const currentIndex = indexRef;
    const minIndex = getMinListIndex(listRef(), disabledIndicesValue);
    const maxIndex = getMaxListIndex(listRef(), disabledIndicesValue);

    if (!typeableComboboxReference()) {
      if (event.key === 'Home') {
        stopEvent(event);
        indexRef = minIndex;
        onNavigate(event);
      }

      if (event.key === 'End') {
        stopEvent(event);
        indexRef = maxIndex;
        onNavigate(event);
      }
    }

    // Grid navigation is injected by grid-capable consumers so non-grid
    // consumers (menu, select) tree-shake the grid helpers out.
    const navigateGridValue = navigateGrid();
    if (navigateGridValue != null) {
      const index = navigateGridValue(
        event,
        indexRef,
        listRef(),
        orientationValue,
        loopFocusValue,
        rtlValue,
        disabledIndicesValue,
        minIndex,
        maxIndex,
      );

      // The grid navigator returns the unchanged index for keys it does not handle, and
      // reporting that as a navigation would re-emit the current highlight on every keydown.
      if (index != null && index !== indexRef) {
        indexRef = index;
        onNavigate(event);
      }

      if (orientationValue === 'both') {
        return;
      }
    }

    if (isMainOrientationKey(event.key, orientationValue)) {
      stopEvent(event);

      // Reset the index if no item is focused. Focus can also rest on a container inside the
      // popup, such as a list that holds the `menu` role. Keys bubbling from a portaled nested
      // popup are not in this popup's DOM, so they navigate from the current index.
      const currentTarget = event.currentTarget as Element;
      const focusedElement = activeElement(currentTarget.ownerDocument);
      if (
        open() &&
        !virtual() &&
        contains(currentTarget, focusedElement) &&
        !listRef().current.some((item) => item != null && contains(item, focusedElement))
      ) {
        indexRef = isMainOrientationToEndKey(event.key, orientationValue, rtlValue)
          ? minIndex
          : maxIndex;
        onNavigate(event);
        // The boundary item may already be highlighted, so `activeIndex` won't change and the
        // effect that moves focus to the highlighted item won't run.
        if (activeIndexValue === indexRef) {
          focusItem();
        }
        return;
      }

      const { index, wrapped } = getNextListIndex(listRef().current, currentIndex, {
        decrement: !isMainOrientationToEndKey(event.key, orientationValue, rtlValue),
        loopFocus: loopFocusValue,
        allowEscape: allowEscape(),
        disabledIndices: disabledIndicesValue,
        minIndex,
        maxIndex,
      });
      if (wrapped) {
        // Give time for virtualizers to update the listRef.
        forceSyncFocusRef = false;
      }
      indexRef = index;

      onNavigate(event);
    }
  };

  /**
   * Moves the highlight imperatively, mirroring what the main-orientation arrow keys do while
   * the popup is open. Unlike the key handlers, this never lands outside the list: `'previous'`
   * from the first item wraps to the last one instead of escaping to the reference element.
   */
  const highlightItem = (target: HighlightItemTarget) => {
    // Highlighting is meaningless while the list is closed, and calls are deliberately not
    // queued: one made before the popup opens is dropped rather than replayed on open.
    if (!enabled() || !latestOpenRef.current) {
      return;
    }

    const list = listRef().current;

    if (target === 'none') {
      // A focus move from an earlier call may still be queued for the next frame. Cancel it
      // unconditionally: if it landed after the clear, the item's focus handler would resync the
      // index and re-highlight the item that was just cleared.
      cancelQueuedFocusRef?.();
      cancelQueuedFocusRef = null;

      indexRef = -1;
      isPointerModalityRef = false;
      forceSyncFocusRef = false;
      onNavigate(undefined, 'imperative');

      // With real DOM focus the highlight and the focused element must not diverge: leaving
      // focus on an item would let Enter activate something that no longer looks highlighted.
      // Focus is reclaimed from any item, not only the one the index pointed at, because a
      // preceding move may not have applied its focus yet. It is never reclaimed from unrelated
      // content inside the popup - a nested non-portalled popup owning focus must keep it.
      if (!virtual()) {
        const floatingFocusEl = floatingFocusElementRef.current;
        const activeEl = activeElement(ownerDocument(floatingFocusEl));
        if (floatingFocusEl && list.some((item) => item && contains(item, activeEl))) {
          floatingFocusEl.focus({ preventScroll: true });
        }
      }
      return;
    }

    if (list.length === 0) {
      return;
    }

    const disabled = disabledIndicesRef.current;
    const minIndex = getMinListIndex(listRef(), disabled);
    const maxIndex = getMaxListIndex(listRef(), disabled);
    const currentIndex = indexRef;
    const decrement = target === 'previous';

    let nextIndex: number;

    if (target === 'first') {
      nextIndex = minIndex;
    } else if (target === 'last') {
      nextIndex = maxIndex;
    } else if (isIndexOutOfListBounds(list, currentIndex)) {
      // Nothing is highlighted yet, so both directions enter the list from their own end.
      nextIndex = decrement ? maxIndex : minIndex;
    } else {
      // Unlike the arrow keys, this never escapes the list to the reference element.
      nextIndex = getNextListIndex(list, currentIndex, {
        decrement,
        loopFocus: loopFocus(),
        allowEscape: false,
        disabledIndices: disabled,
        minIndex,
        maxIndex,
      }).index;
    }

    // Every item can be disabled or hidden, in which case there is nothing to highlight.
    if (isIndexOutOfListBounds(list, nextIndex)) {
      return;
    }

    indexRef = nextIndex;
    isPointerModalityRef = false;
    forceSyncFocusRef = false;
    // The caller had no chance to scroll the item into view, so always do it here regardless of
    // the modality the user last interacted with.
    forceScrollIntoViewRef = true;
    onNavigate(undefined, 'imperative');
  };

  // Port note: React's `onFocus` bubbles, so it's `onFocusIn` here.
  const item: NonNullable<ElementProps['item']> = {
    onFocusIn(event: FocusEvent) {
      forceSyncFocusRef = true;
      syncCurrentTarget(event);
    },
    onClick(event: MouseEvent) {
      // Safari. Skipped under virtual focus, which must keep real focus on the reference.
      if (!virtual()) {
        (event.currentTarget as HTMLElement).focus({ preventScroll: true });
      }
    },
    onMouseMove(event: MouseEvent) {
      if (isStationaryWebKitPointer(event)) {
        return;
      }
      forceSyncFocusRef = true;
      forceScrollIntoViewRef = false;
      if (focusItemOnHover()) {
        syncCurrentTarget(event);
      }
    },
    onPointerLeave(event: PointerEvent) {
      if (!latestOpenRef.current || !isPointerModalityRef || event.pointerType === 'touch') {
        return;
      }

      forceSyncFocusRef = true;

      const relatedTarget = event.relatedTarget as HTMLElement | null;

      if (!focusItemOnHover() || listRef().current.includes(relatedTarget)) {
        return;
      }

      if (!resetOnPointerLeaveRef.current) {
        return;
      }

      cancelQueuedFocusRef?.();
      cancelQueuedFocusRef = null;

      indexRef = -1;
      onNavigate(event);

      if (!virtual()) {
        const floatingFocusEl = floatingFocusElementRef.current;
        const activeEl = activeElement(ownerDocument(floatingFocusEl));
        if (floatingFocusEl && contains(floatingFocusEl, activeEl)) {
          floatingFocusEl.focus({ preventScroll: true });
        }
      }
    },
  };

  const ariaActiveDescendantProp = () => {
    return (
      virtual() &&
      open() &&
      hasActiveIndex() && {
        'aria-activedescendant': `${id()}-${activeIndex()}`,
      }
    );
  };

  const floatingHandlers: NonNullable<ElementProps['floating']> = {
    onKeyDown(event: KeyboardEvent) {
      // Close submenu on Shift+Tab
      if (event.key === 'Tab' && event.shiftKey && open() && !virtual()) {
        // If the event originated from within a nested element (e.g., a Dialog opened from
        // within the menu), don't close the menu. The nested element has its own focus
        // management and should handle the Tab key.
        const target = getTarget(event) as Element | null;
        if (target && !contains(floatingFocusElementRef.current, target)) {
          return;
        }

        stopEvent(event);
        const details = createChangeEventDetails(REASONS.focusOut, event);
        store.setOpen(false, details);

        const returnElement = nestedReturnFocusRef()?.current ?? domReferenceElement();
        if (!details.isCanceled && isHTMLElement(returnElement)) {
          returnElement.focus();
        }

        return;
      }

      commonOnKeyDown(event);
    },
    onPointerMove(event: PointerEvent) {
      if (isStationaryWebKitPointer(event)) {
        return;
      }
      isPointerModalityRef = true;
    },
  };

  function openOnNavigationKeyDown(event: KeyboardEvent) {
    store.setOpen(
      true,
      createChangeEventDetails(REASONS.listNavigation, event, event.currentTarget as HTMLElement),
    );
  }

  function checkVirtualMouse(event: MouseEvent) {
    if (focusItemOnOpen() === 'auto' && isVirtualClick(event)) {
      focusItemOnOpenRef = !virtual();
    }
  }

  function checkVirtualPointer(event: PointerEvent) {
    // `pointerdown` fires first, reset the state then perform the checks.
    const focusItemOnOpenValue = focusItemOnOpen();
    focusItemOnOpenRef = focusItemOnOpenValue;
    if (focusItemOnOpenValue === 'auto' && isVirtualPointerEvent(event)) {
      focusItemOnOpenRef = true;
    }
  }

  // Port note: React's `onFocus` bubbles, so it's `onFocusIn` here.
  const trigger: NonNullable<ElementProps['trigger']> = {
    onKeyDown(event: KeyboardEvent) {
      // non-reactive open state (to prevent re-creation of the handler)
      const currentOpen = store.select('open');
      isPointerModalityRef = false;

      const nestedValue = nested();
      const virtualValue = virtual();
      const isArrowKey = event.key.startsWith('Arrow');
      const isParentCrossOpenKey = isCrossOrientationOpenKey(
        event.key,
        getParentOrientation(),
        rtl(),
      );
      const isMainKey = isMainOrientationKey(
        event.key,
        currentOpen ? orientation() : triggerOrientation(),
      );
      const isNavigationKey =
        (nestedValue ? isParentCrossOpenKey : isMainKey) ||
        event.key === 'Enter' ||
        event.key.trim() === '';

      if (virtualValue && currentOpen && (!nestedValue || isTypeableElement(event.currentTarget))) {
        return commonOnKeyDown(event);
      }

      // If a floating element should not open on arrow key down, avoid
      // setting `activeIndex` while it's closed.
      if (!currentOpen && !openOnArrowKeyDown() && isArrowKey) {
        return undefined;
      }

      if (isNavigationKey) {
        const isParentMainKey = isMainOrientationKey(event.key, getParentOrientation());
        keyRef = nestedValue && isParentMainKey ? null : event.key;
      }

      if (nestedValue) {
        if (isParentCrossOpenKey) {
          stopEvent(event);

          if (currentOpen) {
            indexRef = getMinEnabledIndex();
            onNavigate(event);
            if (virtualValue) {
              floatingFocusElementRef.current?.focus();
            }
          } else {
            openOnNavigationKeyDown(event);
          }
        }

        return undefined;
      }

      if (isMainKey) {
        if (selectedIndexRef.current != null) {
          indexRef = selectedIndexRef.current;
        }

        stopEvent(event);

        if (!currentOpen && openOnArrowKeyDown()) {
          openOnNavigationKeyDown(event);
        } else {
          commonOnKeyDown(event);
        }

        if (currentOpen) {
          onNavigate(event);
        }
      }

      return undefined;
    },
    onFocusIn(event: FocusEvent) {
      if (event.target !== event.currentTarget) {
        return;
      }

      if (store.select('open') && !virtual()) {
        indexRef = -1;
        onNavigate(event);
      }
    },
    onPointerDown: checkVirtualPointer,
    onPointerEnter: checkVirtualPointer,
    onMouseDown: checkVirtualMouse,
    onClick: checkVirtualMouse,
  };

  return {
    get reference() {
      if (!enabled()) {
        return undefined;
      }
      return {
        ...ariaActiveDescendantProp(),
        ...trigger,
      };
    },
    get floating() {
      if (!enabled()) {
        return undefined;
      }
      return {
        ...(!typeableComboboxReference() ? ariaActiveDescendantProp() : {}),
        ...floatingHandlers,
      };
    },
    get item() {
      return enabled() ? item : undefined;
    },
    get trigger() {
      return enabled() ? trigger : undefined;
    },
    highlightItem,
  };
}
