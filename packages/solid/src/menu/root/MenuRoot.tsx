import { createMemo, createSignal, Show, untrack, useContext } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { useImperativeHandle } from '../../internals/useImperativeHandle';
import { useFloatingParentNodeIdAccessor } from '../../floating-ui-solid/components/FloatingTree';
import {
  FloatingTree,
  useDismiss,
  useFloatingNodeId,
  useListNavigation,
  useTypeahead,
  useSyncedFloatingRootContext,
} from '../../floating-ui-solid';
import type { HighlightItemTarget } from '../../floating-ui-solid/hooks/useListNavigation';
import { MenuRootContext, useMenuRootContext } from './MenuRootContext';
import type { MenubarContext } from '../../menubar/MenubarContext';
import { useMenubarContext } from '../../menubar/MenubarContext';
import { TYPEAHEAD_RESET_MS } from '../../internals/constants';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import type {
  BaseUIChangeEventDetails,
  BaseUIHighlightEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { getHighlightReason } from '../../utils/getHighlightReason';
import type { ContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { useAnimationsFinished } from '../../internals/useAnimationsFinished';
import { MenuStore } from '../store/MenuStore';
import type { State as MenuStoreState } from '../store/MenuStore';
import type { MenuHandle } from '../store/MenuHandle';
import type { PayloadChildRenderFunction } from '../../utils/popups';
import {
  attachPreventUnmountOnClose,
  FOCUSABLE_POPUP_PROPS,
  createPopupOpenState,
  usePopupHandleAttachment,
  useImplicitActiveTrigger,
  useOpenStateTransitions,
  usePopupInteractionProps,
} from '../../utils/popups';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { HTMLProps } from '../../internals/types';
import { MenuFilterProviderContext } from '../filter-provider/MenuFilterProviderContext';
import { isKeyboardClick, isKeyboardOpen } from '../utils/isKeyboardOpen';

export function MenuRootInternal<Payload>(props: MenuRootInternalProps<Payload>): JSX.Element {
  const disabledProp = () => props.disabled ?? false;
  const modalProp = () => props.modal;
  const loopFocus = () => props.loopFocus ?? true;
  const orientation = () => props.orientation ?? 'vertical';
  const closeParentOnEsc = () => props.closeParentOnEsc ?? false;
  const highlightItemOnHover = () => props.highlightItemOnHover ?? true;
  // Port note: these internal props are set by the filter roots and don't change.
  const isSubmenu = untrack(() => props.isSubmenu ?? false);
  const virtualFocus = untrack(() => props.virtualFocus ?? false);
  const virtualFocusRef = untrack(() => props.virtualFocusRef);
  const allowEscape = () => props.allowEscape ?? true;
  const resetOnPointerLeave = () => props.resetOnPointerLeave ?? true;
  const webkitItemSelected = () => props.webkitItemSelected ?? false;

  const contextMenuContext = useContextMenuRootContext(true);
  const parentMenuRootContext = useMenuRootContext(true);
  const menubarContext = useMenubarContext(true);

  // Depend on the stable pieces rather than the parent context object, so a parent context
  // invalidation doesn't cascade into every descendant root's context.
  const enclosingMenuStore = parentMenuRootContext?.store;
  const parentVirtualFocus = () => parentMenuRootContext?.virtualFocus ?? false;
  const parentWebkitItemSelected = () => parentMenuRootContext?.webkitItemSelected ?? false;

  // Port note: computed once; it only depends on which contexts are present.
  const parentFromContext: MenuParent = (() => {
    if (isSubmenu && enclosingMenuStore) {
      return {
        type: 'menu',
        store: enclosingMenuStore,
      };
    }

    if (menubarContext) {
      return {
        type: 'menubar',
        context: menubarContext,
      };
    }

    // Ensure this is not a Menu nested inside ContextMenu.Trigger.
    // ContextMenu parentContext is always undefined as ContextMenu.Root is instantiated with
    // <MenuRootContext value={null}>
    if (contextMenuContext && !enclosingMenuStore) {
      return {
        type: 'context-menu',
        context: contextMenuContext,
      };
    }

    return {
      type: undefined,
    };
  })();

  const rootId = useBaseUiId();
  const defaultFloatingId = useBaseUiId();

  const [renderedFloatingId, setRenderedFloatingId] = createSignal<string | undefined>(undefined);

  // A registered `''` means the popup rendered with an explicitly empty id, so nothing may point
  // at the generated fallback.
  const floatingId = () => (renderedFloatingId() ?? defaultFloatingId) || undefined;

  const floatingParentNodeIdFromContext = useFloatingParentNodeIdAccessor();

  const parentMenuStore = parentFromContext.type === 'menu' ? parentFromContext.store : undefined;
  // An initially open submenu should animate in only when the user watches it appear, i.e. when
  // its subtree mounts because the parent popup is playing its own enter transition. A parent
  // that was `defaultOpen` at page load never passes through `'starting'`, and under a
  // `keepMounted` parent these initializers run at page load while the parent's status is still
  // `undefined` — in both cases the submenu is page-load content that must not animate. Gated on
  // being open at mount so a closed submenu doesn't seed `instantType` it would never clear. Read
  // during setup only.
  const animateInitialOpen = untrack(
    () =>
      (props.open ?? props.defaultOpen ?? false) &&
      parentMenuStore?.state.transitionStatus === 'starting',
  );

  // Mirror an instantly-opened parent (e.g. keyboard click) so `[data-instant]` styling
  // suppresses the enter transition on both popups or neither.
  const seededInstantType = animateInitialOpen ? parentMenuStore?.state.instantType : undefined;

  const store = untrack(() => {
    const menuStore = new MenuStore<Payload>(
      {
        open: props.defaultOpen ?? false,
        openProp: props.open,
        activeTriggerId: props.defaultTriggerId ?? null,
        triggerIdProp: props.triggerId,
        parent: parentFromContext,
        disabled: disabledProp(),
        highlightItemOnHover: highlightItemOnHover(),
        modal: parentFromContext.type === undefined ? modalProp() : undefined,
        rootId,
        instantType: seededInstantType,
      },
      floatingId(),
      untrack(floatingParentNodeIdFromContext) != null,
    );
    // A stable ref object, so descendants can read it from the first render.
    menuStore.context.virtualFocusRef = virtualFocusRef;
    return menuStore;
  });

  store.useControlledProp('openProp', () => props.open);
  store.useControlledProp('triggerIdProp', () => props.triggerId);

  store.useContextCallback('onOpenChangeComplete', () => props.onOpenChangeComplete);

  const floatingTreeRoot = store.useState('floatingTreeRoot');

  const floatingNodeIdFromContext = useFloatingNodeId(floatingTreeRoot);
  // Port note: Solid descendants mount before parent effects. Seed the tree IDs now so
  // nested roots read their parent ID on their first mount, including triggerless menus.
  store.update({
    floatingNodeId: floatingNodeIdFromContext,
    floatingParentNodeId: untrack(floatingParentNodeIdFromContext),
  });

  const open = store.useState('open');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const positionerElement = store.useState('positionerElement');
  const hoverEnabled = store.useState('hoverEnabled');
  const disabled = store.useState('disabled');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const parent = store.useState('parent');
  const activeIndex = store.useState('activeIndex');
  const keyboardOpen = store.useState('keyboardOpen');
  const payload = store.useState('payload') as () => Payload | undefined;
  const floatingParentNodeId = store.useState('floatingParentNodeId');

  const openEventRef: RefObject<Event | null> = { current: null };
  const allowOutsidePressDismissalRef = {
    current: untrack(parent).type !== 'context-menu',
  };
  const allowOutsidePressDismissalTimeout = useTimeout();
  const allowTouchToCloseRef = { current: true };
  const allowTouchToCloseTimeout = useTimeout();

  const nested = () => floatingParentNodeId() != null;

  if (IS_DEV) {
    // Port note: upstream warns on every render; this warns whenever the inputs change.
    useIsoLayoutEffect(
      ([parentType, modal]) => {
        if (parentType !== undefined && modal !== undefined) {
          console.warn(
            'Base UI: The `modal` prop is not supported on nested menus. It will be ignored.',
          );
        }
      },
      () => [parent().type, modalProp()] as const,
    );
  }

  const { openMethod, triggerProps: interactionTypeProps } = useOpenInteractionType(open);

  store.useSyncedValues(() => ({
    disabled: disabledProp(),
    highlightItemOnHover: highlightItemOnHover(),
    modal: parent().type === undefined ? modalProp() : undefined,
    openMethod: openMethod(),
    rootId,
  }));

  useImplicitActiveTrigger(store);
  const { forceUnmount, transitionStatus } = useOpenStateTransitions(
    open,
    store,
    () => {
      store.set('allowMouseEnter', false);
    },
    animateInitialOpen,
  );

  const runOnceAnimationsFinish = useAnimationsFinished(() => store.context.popupRef.current);

  // An inherited `instantType` is only for the initial reveal. A later controlled `open` flip
  // bypasses `setOpen`, so nothing would reset it and `[data-instant]` would wrongly suppress
  // every subsequent transition. Clear it once the enter phase settles, unless an interactive
  // open change already replaced it.
  useEffect(
    ([openValue, transitionStatusValue]) => {
      if (seededInstantType === undefined) {
        return undefined;
      }

      const clearSeededInstantType = () => {
        if (store.state.instantType === seededInstantType) {
          store.set('instantType', undefined);
        }
      };

      // A controlled close can interrupt the initial enter before the animations-finished cleanup
      // below fires (its abort cancels the pending callback, and a closed popup schedules no new
      // one). Nothing is left to protect once closing starts — the exit's suppression was already
      // decided at its trigger commit — so clear now or the next reopen renders a stale
      // `[data-instant]`.
      if (!openValue) {
        clearSeededInstantType();
        return undefined;
      }

      if (transitionStatusValue !== undefined) {
        return undefined;
      }

      // With no popup element (e.g. its subtree is suspended or waiting on data), there is no
      // enter transition to protect, and `useAnimationsFinished` would return without invoking the
      // callback — a ref assignment alone would never rerun this effect, leaving the seed stuck.
      // Clear immediately: a popup that appears after the reveal settles is page-load-like content.
      if (store.context.popupRef.current == null) {
        clearSeededInstantType();
        return undefined;
      }

      const abortController = new AbortController();
      runOnceAnimationsFinish(clearSeededInstantType, abortController.signal);

      return () => {
        abortController.abort();
      };
    },
    () => [open(), transitionStatus()] as const,
  );

  useIsoLayoutEffect(
    ([floatingNodeId]) => {
      if (contextMenuContext && !parentMenuRootContext) {
        // This is a context menu root.
        // It doesn't support detached triggers yet, so we have to sync the parent context manually.
        store.update({
          parent: {
            type: 'context-menu',
            context: contextMenuContext,
          },
          floatingNodeId,
          floatingParentNodeId: untrack(floatingParentNodeIdFromContext),
        });
      } else if (parentMenuRootContext || !store.select('activeTriggerElement')) {
        // Without an active trigger, the root must supply its own tree IDs.
        // Read the store here: a trigger can register after render, before this effect.
        store.update({
          floatingNodeId,
          floatingParentNodeId: untrack(floatingParentNodeIdFromContext),
        });
      }
    },
    () =>
      [
        floatingNodeIdFromContext,
        activeTriggerElement(),
        floatingParentNodeIdFromContext(),
      ] as const,
  );

  useEffect(
    ([openValue, parentType]) => {
      if (!openValue) {
        openEventRef.current = null;
      }

      if (parentType !== 'context-menu') {
        return;
      }

      if (!openValue) {
        allowOutsidePressDismissalTimeout.clear();
        allowOutsidePressDismissalRef.current = false;
        return;
      }

      // With `mousedown` outside press events and long press touch input, there
      // needs to be a grace period after opening to ensure the dismissal event
      // doesn't fire immediately after open.
      allowOutsidePressDismissalTimeout.start(500, () => {
        allowOutsidePressDismissalRef.current = true;
      });
    },
    () => [open(), parent().type] as const,
  );

  useIsoLayoutEffect(
    ([openValue, hoverEnabledValue]) => {
      if (!openValue && !hoverEnabledValue) {
        store.set('hoverEnabled', true);
      }
    },
    () => [open(), hoverEnabled()] as const,
  );

  const setOpen = (
    nextOpen: boolean,
    eventDetails: Omit<MenuRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) => {
    const reason = eventDetails.reason;

    // Read the store directly, as relayed tree events and stale hover timers can request
    // a close after the state changed but before this component re-rendered.
    if (!nextOpen && !store.select('open')) {
      return;
    }

    const currentActiveTriggerElement = untrack(activeTriggerElement);

    if (
      untrack(open) === nextOpen &&
      eventDetails.trigger === currentActiveTriggerElement &&
      untrack(lastOpenChangeReason) === reason
    ) {
      return;
    }

    const shouldPreventUnmountOnClose = attachPreventUnmountOnClose(
      eventDetails as MenuRoot.ChangeEventDetails,
    );

    // Do not immediately reset the activeTriggerId to allow
    // exit animations to play and focus to be returned correctly.
    if (!nextOpen && eventDetails.trigger == null) {
      eventDetails.trigger = currentActiveTriggerElement ?? undefined;
    }

    untrack(() => props.onOpenChange)?.(nextOpen, eventDetails as MenuRoot.ChangeEventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    store.state.floatingRootContext.dispatchOpenChange(nextOpen, eventDetails);

    const nativeEvent = eventDetails.event as Event;
    if (
      nextOpen === false &&
      reason !== REASONS.itemPress &&
      nativeEvent?.type === 'click' &&
      (nativeEvent as PointerEvent).pointerType === 'touch' &&
      !allowTouchToCloseRef.current
    ) {
      return;
    }

    // Prevent the menu from closing on mobile devices that have a delayed click event.
    // In some cases the menu, when tapped, will fire the focus event first and then the click event.
    // Without this guard, the menu will close immediately after opening.
    if (nextOpen && reason === REASONS.triggerFocus) {
      allowTouchToCloseRef.current = false;
      allowTouchToCloseTimeout.start(300, () => {
        allowTouchToCloseRef.current = true;
      });
    } else {
      allowTouchToCloseRef.current = true;
      allowTouchToCloseTimeout.clear();
    }

    const isDismissClose = !nextOpen && (reason === REASONS.escapeKey || reason == null);

    openEventRef.current = eventDetails.event;

    const popupOpenState = createPopupOpenState(
      store.state,
      nextOpen,
      eventDetails.trigger,
      shouldPreventUnmountOnClose(),
    ) as ReturnType<typeof createPopupOpenState> & {
      openChangeReason: MenuRoot.ChangeEventReason;
      instantType: MenuStoreState<Payload>['instantType'];
      keyboardOpen: boolean;
    };

    popupOpenState.openChangeReason = reason;
    popupOpenState.keyboardOpen = nextOpen && isKeyboardOpen(reason, nativeEvent);

    const parentType = untrack(parent).type;
    if (
      parentType === 'menubar' &&
      (reason === REASONS.triggerFocus ||
        reason === REASONS.focusOut ||
        reason === REASONS.triggerHover ||
        reason === REASONS.listNavigation ||
        reason === REASONS.siblingOpen)
    ) {
      popupOpenState.instantType = 'group';
    } else if (isKeyboardClick(reason, nativeEvent)) {
      popupOpenState.instantType = 'click';
    } else if (isDismissClose) {
      popupOpenState.instantType = 'dismiss';
    } else {
      popupOpenState.instantType = undefined;
    }

    // `instantType` must land in the same update that mounts the popup subtree, so an initially
    // open submenu seeding its own store from this one reads it.
    store.update(popupOpenState);
  };

  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: store,
    floatingRootContext: store.state.floatingRootContext,
    get floatingId() {
      return floatingId();
    },
    nested: untrack(floatingParentNodeIdFromContext) != null,
    onOpenChange: setOpen,
  });

  const floatingEvents = floatingRootContext.context.events;

  // Registered in a layout effect (not a passive one) so `setOpen` emits from imperative
  // `MenuHandle.open()` calls made in the same commit this root mounts are received instead of
  // being silently dropped.
  useIsoLayoutEffect(
    () => {
      const handleSetOpenEvent = ({
        open: nextOpen,
        eventDetails,
      }: {
        open: boolean;
        eventDetails: MenuRoot.ChangeEventDetails;
      }) => setOpen(nextOpen, eventDetails);

      floatingEvents.on('setOpen', handleSetOpenEvent);

      return () => {
        floatingEvents?.off('setOpen', handleSetOpenEvent);
      };
    },
    () => [floatingEvents],
  );

  useIsoLayoutEffect(
    () => store.subscribeToParentMenu(),
    () => [store],
  );

  const handleImperativeClose = () => {
    store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction));
  };

  // Port note: counterpart of `React.useImperativeHandle(ctx?.positionerRef, …)` and
  // `React.useImperativeHandle(ctx?.actionsRef, …)`.
  useIsoLayoutEffect(
    ([parentValue, positionerElementValue]) => {
      let ctx: ContextMenuRootContext | undefined;
      if (parentValue.type === 'context-menu') {
        ctx = parentValue.context;
      }
      if (!ctx) {
        return undefined;
      }
      const context = ctx;
      context.positionerRef.current = positionerElementValue;
      context.actionsRef.current = { setOpen };
      return () => {
        context.positionerRef.current = null;
        context.actionsRef.current = null;
      };
    },
    () => [parent(), positionerElement()] as const,
  );

  const dismiss = useDismiss(floatingRootContext, {
    get enabled() {
      return !disabled();
    },
    get bubbles() {
      return { escapeKey: closeParentOnEsc() && parent().type === 'menu' };
    },
    outsidePress() {
      if (untrack(parent).type !== 'context-menu' || openEventRef.current?.type === 'contextmenu') {
        return true;
      }

      return allowOutsidePressDismissalRef.current;
    },
    get externalTree() {
      return nested() ? floatingTreeRoot() : undefined;
    },
  });

  const direction = useDirection();

  const listNavigation = useListNavigation(floatingRootContext, {
    get enabled() {
      return !disabled();
    },
    listRef: store.context.itemDomElements,
    get activeIndex() {
      return activeIndex();
    },
    virtual: virtualFocus,
    get nested() {
      return parent().type === 'menubar' || (!virtualFocus && parent().type !== undefined);
    },
    get parentOrientation() {
      const parentValue = parent();
      return parentValue.type === 'menubar' ? parentValue.context.orientation : undefined;
    },
    get loopFocus() {
      return loopFocus();
    },
    // Filtered menus keep DOM focus on the input, while keyboard and virtual opens initially
    // highlight an item as ordinary menus do. The input stays in the arrow-key loop unless the
    // filter highlights automatically.
    get focusItemOnOpen() {
      return virtualFocus ? keyboardOpen() : undefined;
    },
    get allowEscape() {
      return virtualFocus && loopFocus() && allowEscape();
    },
    get orientation() {
      return orientation();
    },
    // A virtual-focus list can navigate on either axis, but its trigger always opens on the
    // vertical one.
    get triggerOrientation() {
      return virtualFocus ? 'vertical' : orientation();
    },
    get rtl() {
      return direction() === 'rtl';
    },
    disabledIndices: EMPTY_ARRAY,
    onNavigate(nextActiveIndex, event, source) {
      store.setActiveIndex(
        nextActiveIndex,
        source === 'imperative' ? REASONS.imperativeAction : getHighlightReason(event),
        event,
      );
    },
    // A virtual-focus submenu's keyboard opening is orchestrated by its navigation wrapper based
    // on both menus' orientations; the generic arrow-key opening would also react to the parent's
    // forwarded cross-axis keys while closed.
    get openOnArrowKeyDown() {
      return parent().type !== 'context-menu' && !(virtualFocus && isSubmenu);
    },
    get externalTree() {
      return !virtualFocus && nested() ? floatingTreeRoot() : undefined;
    },
    nestedReturnFocusRef: parentMenuStore?.context.virtualFocusRef,
    get focusItemOnHover() {
      return highlightItemOnHover();
    },
    get resetOnPointerLeave() {
      return resetOnPointerLeave();
    },
  });

  useImperativeHandle(() => props.actionsRef, {
    unmount: forceUnmount,
    close: handleImperativeClose,
    highlightItem: listNavigation.highlightItem,
  });

  const onTyping = (nextTyping: boolean) => {
    store.context.typingRef.current = nextTyping;
  };

  const typeahead = useTypeahead(floatingRootContext, {
    // Under virtual focus the input owns typing, so typeahead would race the filter query.
    get enabled() {
      return !disabled() && !virtualFocus;
    },
    listRef: store.context.itemLabels,
    elementsRef: store.context.itemDomElements,
    get activeIndex() {
      return activeIndex();
    },
    resetMs: TYPEAHEAD_RESET_MS,
    onMatch: (index, event) => {
      if (untrack(open) && index !== untrack(activeIndex)) {
        store.setActiveIndex(index, REASONS.keyboard, event);
      }
    },
    onTyping,
  });

  let lastHighlightIndex = -1;

  // Runs when `activeIndex` commits and again when the item registry settles, since an index
  // can come to point at a different element while its value stays the same.
  const syncHighlightedItem = () => {
    const index = store.state.activeIndex;
    const item =
      index === null ? undefined : (store.context.itemDomElements.current[index] ?? undefined);
    // An item removed in this commit stays registered until the list flushes, which calls back
    // here with the settled registry.
    if (item?.isConnected === false) {
      return;
    }

    const itemIndex = item === undefined ? -1 : index!;
    if (lastHighlightIndex === itemIndex && store.context.reportedItem === item) {
      return;
    }

    lastHighlightIndex = itemIndex;
    store.context.reportedItem = item;
    // Only virtual focus renders from the highlighted element. Publishing it in every menu would
    // notify each item's subscription on every highlight change.
    if (virtualFocus) {
      store.set('highlightedItem', item);
    }
    // The tag left by the write that produced this committed value.
    const { highlightReason, highlightEvent } = store.context;
    store.context.highlightReason = REASONS.none;
    store.context.highlightEvent = undefined;
    const onItemHighlighted = untrack(() => props.onItemHighlighted);
    if (!onItemHighlighted) {
      return;
    }
    onItemHighlighted(
      item,
      createGenericEventDetails(highlightReason, highlightEvent, {
        label:
          item === undefined
            ? undefined
            : (store.context.itemLabels.current[itemIndex] ?? undefined),
      }),
    );
  };

  useIsoLayoutEffect(
    () => {
      syncHighlightedItem();
    },
    () => [activeIndex()],
  );

  // Under virtual focus an element inside the popup holds real focus, so it takes the
  // navigation's reference props (`aria-activedescendant` and the key handling) and the trigger
  // keeps only the props that open the menu.
  const openTriggerProps = (): HTMLProps | undefined => {
    if (!virtualFocus) {
      return listNavigation.reference;
    }
    const trigger = listNavigation.trigger;
    if (!trigger) {
      return EMPTY_OBJECT;
    }
    // Focusing the trigger while the menu is open must not seed the virtual highlight. This can
    // happen before a pointer press closes the menu in Safari.
    // Port note: React's `onFocus` is `onFocusIn` here.
    const { onFocusIn, ...rest } = trigger as HTMLProps & { onFocusIn?: unknown };
    return rest;
  };

  store.useSyncedValue('inputProps', () =>
    virtualFocus ? ((listNavigation.reference as HTMLProps) ?? EMPTY_OBJECT) : EMPTY_OBJECT,
  );

  const activeTriggerProps = createMemo(() => {
    const mergedProps = mergePropsSnapshot(
      typeahead.reference as HTMLProps,
      openTriggerProps() as HTMLProps,
      dismiss.reference as HTMLProps,
      {
        onMouseMove() {
          store.set('allowMouseEnter', true);
        },
      },
      interactionTypeProps as HTMLProps,
    ) as HTMLProps;

    (mergedProps as Record<string, unknown>)['aria-haspopup'] = 'menu';
    (mergedProps as Record<string, unknown>)['aria-expanded'] = open();

    return mergedProps;
  });

  const inactiveTriggerProps = createMemo(() => {
    const mergedProps = mergePropsSnapshot(
      listNavigation.trigger as HTMLProps,
      dismiss.trigger as HTMLProps,
      interactionTypeProps as HTMLProps,
    ) as HTMLProps;

    (mergedProps as Record<string, unknown>)['aria-haspopup'] = 'menu';
    (mergedProps as Record<string, unknown>)['aria-expanded'] = false;

    return mergedProps;
  });

  // The initial render has no store subscribers yet. Seed these props before triggers render so
  // the synchronization effect below doesn't make every trigger render twice in the first commit.
  store.update({ inactiveTriggerProps: untrack(inactiveTriggerProps) });

  const popupProps = createMemo(
    () =>
      mergePropsSnapshot(
        FOCUSABLE_POPUP_PROPS as HTMLProps,
        {
          onMouseMove() {
            store.set('allowMouseEnter', true);
            if (untrack(parent).type === 'menu') {
              store.set('hoverEnabled', false);
            }
          },
          onClick() {
            if (store.select('hoverEnabled')) {
              store.set('hoverEnabled', false);
            }
          },
          onKeyDown(event: KeyboardEvent) {
            // The Menubar's CompositeRoot captures keyboard events via
            // event delegation. This works well when Menu.Root is nested inside Menubar,
            // but with detached triggers we need to manually forward the event to the CompositeRoot.
            // Port note: React's `isPropagationStopped()` is `cancelBubble` on native events.
            const relay = store.select('keyboardEventRelay');
            if (relay && !event.cancelBubble) {
              relay(event);
            }
          },
        },
        typeahead.floating as HTMLProps,
        listNavigation.floating as HTMLProps,
        dismiss.floating as HTMLProps,
      ) as HTMLProps,
  );

  const itemProps = () => (listNavigation.item as HTMLProps) ?? EMPTY_OBJECT;

  usePopupInteractionProps(store, () => ({
    floatingRootContext,
    activeTriggerProps: activeTriggerProps(),
    inactiveTriggerProps: inactiveTriggerProps(),
    popupProps: popupProps(),
    itemProps: itemProps(),
  }));

  const context: MenuRootContext<Payload> = {
    store,
    parent: parentFromContext,
    get orientation() {
      return orientation();
    },
    get loopFocus() {
      return loopFocus();
    },
    get allowEscape() {
      return allowEscape();
    },
    defaultFloatingId,
    setRenderedFloatingId: (id) => setRenderedFloatingId(() => id),
    virtualFocus,
    get parentVirtualFocus() {
      return parentVirtualFocus();
    },
    get parentWebkitItemSelected() {
      return parentWebkitItemSelected();
    },
    get webkitItemSelected() {
      return webkitItemSelected();
    },
    syncHighlightedItem,
  };

  // Port note: a render function child is called once with an object whose `payload` is a getter,
  // so read `arg.payload` in a reactive scope instead of destructuring it.
  const renderChildren = () => {
    const children = props.children;
    if (typeof children === 'function' && children.length > 0) {
      return untrack(() =>
        (children as PayloadChildRenderFunction<Payload>)({
          get payload() {
            return payload();
          },
        }),
      );
    }
    return children as JSX.Element;
  };

  // Port note: attach in the Root body so the attachment effect precedes descendant and
  // later sibling effects, matching React's child-first layout effect ordering.
  usePopupHandleAttachment(() => props.handle, store);

  const content = () => (
    <MenuRootContext value={context as MenuRootContext}>{renderChildren()}</MenuRootContext>
  );

  // Port note: React re-renders the children under a new tree when this changes; here the
  // content is recreated when the decision flips.
  const wrapInFloatingTree = createMemo(
    () => parent().type === undefined || parent().type === 'context-menu',
  );

  return (
    <Show when={wrapInFloatingTree()} fallback={content()}>
      {/* set up a FloatingTree to provide the context to nested menus */}
      <FloatingTree externalTree={untrack(floatingTreeRoot)}>{content()}</FloatingTree>
    </Show>
  );
}

/**
 * Groups all parts of the menu.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRoot<Payload>(props: MenuRoot.Props<Payload>): JSX.Element {
  const filterProvider = useContext(MenuFilterProviderContext);

  // Port note: this branch depends only on context presence, which is fixed at mount.
  if (filterProvider === null) {
    // eslint-disable-next-line solid/components-return-once
    return <MenuRootInternal {...props} />;
  }

  const FilterRoot = filterProvider.Root;

  return (
    // The root consumes its provider so a plain submenu inside doesn't inherit it.
    <MenuFilterProviderContext value={null}>
      <FilterRoot {...filterProvider.options} {...props} />
    </MenuFilterProviderContext>
  );
}

export interface MenuRootState {}

export interface MenuRootInternalProps<Payload> extends MenuRoot.Props<Payload> {
  /**
   * Marks this root as a submenu of the enclosing menu.
   */
  isSubmenu?: boolean | undefined;
  /**
   * Keeps real focus on an element inside the popup and navigates the list with
   * `aria-activedescendant`.
   */
  virtualFocus?: boolean | undefined;
  /**
   * The element that retains real focus while virtual list navigation is active.
   */
  virtualFocusRef?: RefObject<HTMLElement | null> | undefined;
  /**
   * Whether virtual focus can leave the list during arrow navigation.
   */
  allowEscape?: boolean | undefined;
  /**
   * Whether pointer leave should clear the active item.
   */
  resetOnPointerLeave?: boolean | undefined;
  /**
   * Whether virtual-focus items need WebKit's `aria-selected` compatibility state.
   */
  webkitItemSelected?: boolean | undefined;
}

export interface MenuRootProps<Payload = unknown> {
  /**
   * Whether the menu is initially open.
   *
   * To render a controlled menu, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Determines if the menu enters a modal state when open.
   * - `true`: user interaction is limited to the menu: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   *
   * Nested menus ignore this prop, and menus opened by hover are never modal.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the menu is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Callback fired when an item is highlighted or unhighlighted.
   * Receives the highlighted item element (or `undefined` if no item is highlighted) and details
   * containing the reason for the change, the event, and the item's text label.
   * The `reason` can be:
   * - `'keyboard'`: the highlight changed due to keyboard navigation.
   * - `'pointer'`: the highlight changed due to pointer hovering. The event may be a `MouseEvent`
   *   rather than a `PointerEvent`.
   * - `'imperative-action'`: the highlight changed via `actionsRef`'s `highlightItem`.
   * - `'none'`: the highlight changed for another reason, such as automatic highlighting while
   *   filtering, the item list changing, or the popup opening or closing.
   */
  onItemHighlighted?:
    | ((
        highlightedItem: HTMLElement | undefined,
        eventDetails: MenuRoot.HighlightEventDetails,
      ) => void)
    | undefined;
  /**
   * Whether the menu is currently open.
   */
  open?: boolean | undefined;
  /**
   * The visual orientation of the menu.
   * Controls whether roving focus uses up/down or left/right arrow keys.
   * @default 'vertical'
   */
  orientation?: MenuRoot.Orientation | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When in a submenu, determines whether pressing the Escape key
   * closes the entire menu, or only the current child menu.
   * @default false
   */
  closeParentOnEsc?: boolean | undefined;
  /**
   * A callback that receives the imperative actions. It's called once, when the component is
   * set up (like a `ref` callback).
   * - `unmount`: Ends the closing phase of the menu after an externally controlled closing animation finishes.
   *   Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the menu completes closing on its own.
   *   Whether it leaves the DOM is decided by `keepMounted` on the portal.
   * - `close`: Closes the menu imperatively when called.
   * - `highlightItem`: Moves or clears the highlight while the menu is open.
   *   `'next'` and `'previous'` move sequentially through the items and wrap unless `loopFocus`
   *   is disabled. `'first'` and `'last'` highlight the first or last item. `'none'` clears the
   *   highlight and hands focus back to the popup.
   *   Calling this action does not open the menu. To highlight an item after opening it, call
   *   the action from `onOpenChangeComplete` when `open` is `true`.
   *   Highlight changes requested through this action report the reason `'imperative-action'`
   *   to `onItemHighlighted`.
   */
  actionsRef?: ((actions: MenuRoot.Actions) => void) | undefined;
  /**
   * ID of the trigger that the menu is associated with.
   * This is useful in conjunction with the `open` prop to create a controlled menu.
   * There's no need to specify this prop when the menu is uncontrolled (that is, when the `open` prop is not set).
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the menu is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open menu.
   */
  defaultTriggerId?: string | null | undefined;
  /**
   * A handle to associate the menu with a trigger.
   * If specified, allows external triggers to control the menu's open state.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * The content of the menu.
   * This can be a regular Solid node or a render function that receives the `payload` of the active trigger.
   */
  children?: JSX.Element | PayloadChildRenderFunction<Payload> | undefined;
}

/**
 * The item `highlightItem` moves the highlight to.
 * - `'next'` and `'previous'` move relative to the current highlight, or enter the list from
 *   the matching end when nothing is highlighted. They wrap around unless `loopFocus` is
 *   disabled and never leave the list.
 * - `'first'` and `'last'` jump to either end of the list.
 * - `'none'` clears the highlight and hands focus back to the popup.
 */
export type MenuRootHighlightItemTarget = HighlightItemTarget;

export interface MenuRootActions {
  unmount: () => void;
  close: () => void;
  highlightItem: (target: MenuRootHighlightItemTarget) => void;
}

export type MenuRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.focusOut
  | typeof REASONS.listNavigation
  | typeof REASONS.escapeKey
  | typeof REASONS.itemPress
  | typeof REASONS.closePress
  | typeof REASONS.siblingOpen
  | typeof REASONS.cancelOpen
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type MenuRootChangeEventDetails = BaseUIChangeEventDetails<MenuRoot.ChangeEventReason> & {
  /** Prevents the popup from unmounting until the `unmount` action is called. */
  preventUnmountOnClose: () => void;
};

export type MenuRootHighlightEventReason =
  | typeof REASONS.keyboard
  | typeof REASONS.pointer
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type MenuRootHighlightEventDetails = BaseUIHighlightEventDetails<
  MenuRoot.HighlightEventReason,
  {
    /**
     * The highlighted item's `label` prop, or its text content when the prop is not set.
     */
    label: string | undefined;
  }
>;

export type MenuRootOrientation = 'horizontal' | 'vertical';

export type MenuParent =
  | {
      type: 'menu';
      store: MenuStore<unknown>;
    }
  | {
      type: 'menubar';
      context: MenubarContext;
    }
  | {
      type: 'context-menu';
      context: ContextMenuRootContext;
    }
  | {
      type: 'nested-context-menu';
      context: ContextMenuRootContext;
      menuContext: MenuRootContext;
    }
  | {
      type: undefined;
    };

export namespace MenuRoot {
  export type State = MenuRootState;
  export type Props<Payload = unknown> = MenuRootProps<Payload>;
  export type Actions = MenuRootActions;
  export type HighlightItemTarget = MenuRootHighlightItemTarget;
  export type ChangeEventReason = MenuRootChangeEventReason;
  export type ChangeEventDetails = MenuRootChangeEventDetails;
  export type HighlightEventReason = MenuRootHighlightEventReason;
  export type HighlightEventDetails = MenuRootHighlightEventDetails;
  export type Orientation = MenuRootOrientation;
}
