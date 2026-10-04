import { createMemo, createRoot, createSignal, omit, onCleanup, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import {
  safePolygon,
  useClick,
  useFloatingTree,
  useFocus,
  useHoverReferenceInteraction,
  useFloatingNodeId,
  useFloatingParentNodeId,
} from '../../floating-ui-react';
import { FloatingTreeStore } from '../../floating-ui-react/components/FloatingTreeStore';
import { contains } from '../../floating-ui-react/utils';
import { useMenuRootContext } from '../root/MenuRootContext';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button/useButton';
import { isMouseWithinBounds } from '../../utils/getPseudoElementBounds';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';
import { useCompositeRootContext } from '../../internals/composite/root/CompositeRootContext';
import { findRootOwnerId } from '../utils/findRootOwnerId';
import { usePopupHandleStore, useTriggerDataForwarding } from '../../utils/popups';
import { useTriggerFocusGuards } from '../../utils/popups/useTriggerFocusGuards';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { REASONS } from '../../internals/reasons';
import { useMixedToggleClickHandler } from '../../utils/useMixedToggleClickHandler';
import type { MenuHandle } from '../store/MenuHandle';
import type { MenuHandleStore } from '../store/MenuStore';
import { useMenubarContext } from '../../menubar/MenubarContext';
import type { MenuParent } from '../root/MenuRoot';
import { PATIENT_CLICK_THRESHOLD } from '../../internals/constants';
import { FocusGuard } from '../../utils/FocusGuard';
import { mergeProps } from '../../merge-props';

/**
 * A button that opens the menu.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuTrigger<Payload>(componentProps: MenuTrigger.Props<Payload>): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'disabled',
    'nativeButton',
    'id',
    'openOnHover',
    'delay',
    'closeDelay',
    'handle',
    'payload',
  );

  const disabledProp = () => componentProps.disabled ?? false;
  const nativeButton = () => componentProps.nativeButton ?? true;
  const delay = () => componentProps.delay ?? 100;
  const closeDelay = () => componentProps.closeDelay ?? 0;

  const rootContext = useMenuRootContext(true);
  // Port note: `usePopupHandleStore` reads its handle once, so it's recreated (with its
  // subscription) when the `handle` prop changes, like upstream re-subscribing to the new handle.
  const handleStoreAccessor = createMemo(() => usePopupHandleStore(componentProps.handle));
  const handleStore = () => handleStoreAccessor()();
  // Port note: a detached trigger follows the store its handle exposes, so the store is an
  // accessor (upstream re-renders with the new store).
  const store: Accessor<MenuHandleStore<unknown>> = createMemo(
    () => handleStore() ?? (rootContext?.store as MenuHandleStore<unknown>),
  );
  if (!untrack(store)) {
    throw new Error(
      'Base UI: <Menu.Trigger> must be either used within a <Menu.Root> component or provided with a handle.',
    );
  }

  const useStoreState = createStoreStateReader(store);

  const generatedId = useBaseUiId();
  const thisTriggerId = () => (componentProps.id as string | undefined) ?? generatedId;

  const isTriggerActive = useStoreState('isTriggerActive', thisTriggerId);
  const floatingRootContext = useStoreState('floatingRootContext');
  const isOpenedByThisTrigger = useStoreState('isOpenedByTrigger', thisTriggerId);
  const controlsId = useStoreState('triggerControlsId', thisTriggerId);

  const triggerElementRef: RefObject<HTMLElement | null> = { current: null };

  const parent = useMenuParent();
  const compositeRootContext = useCompositeRootContext(true);
  const floatingTreeRootFromContext = useFloatingTree();

  const floatingTreeRoot: FloatingTreeStore =
    floatingTreeRootFromContext ?? new FloatingTreeStore();

  const floatingNodeId = useFloatingNodeId(floatingTreeRoot);
  const floatingParentNodeId = useFloatingParentNodeId();

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef,
    store,
    () => ({
      payload: componentProps.payload,
      closeDelay: closeDelay(),
      parent,
      floatingTreeRoot,
      floatingNodeId,
      floatingParentNodeId,
      keyboardEventRelay: compositeRootContext?.relayKeyboardEvent,
    }),
  );

  const isInMenubar = parent.type === 'menubar';

  const rootDisabled = useStoreState('disabled');

  const disabled = () =>
    disabledProp() || rootDisabled() || (isInMenubar && parent.context.disabled);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  useEffect(
    ([storeValue, isOpenedByThisTriggerValue]) => {
      if (!isOpenedByThisTriggerValue && parent.type === undefined) {
        storeValue.context.allowMouseUpTriggerRef.current = false;
      }
    },
    () => [store(), isOpenedByThisTrigger()] as const,
  );

  let triggerElement: HTMLElement | null = null;
  const allowMouseUpTriggerTimeout = useTimeout();

  const handleDocumentMouseUp = (mouseEvent: MouseEvent) => {
    if (!triggerElement) {
      return;
    }

    const currentStore = untrack(store);

    allowMouseUpTriggerTimeout.clear();
    currentStore.context.allowMouseUpTriggerRef.current = false;

    const mouseUpTarget = mouseEvent.target as Element | null;

    if (
      contains(triggerElement, mouseUpTarget) ||
      contains(currentStore.select('positionerElement'), mouseUpTarget) ||
      mouseUpTarget === triggerElement
    ) {
      return;
    }

    if (mouseUpTarget != null && findRootOwnerId(mouseUpTarget) === currentStore.select('rootId')) {
      return;
    }

    if (isMouseWithinBounds(mouseEvent, triggerElement)) {
      return;
    }

    floatingTreeRoot.events.emit('close', { domEvent: mouseEvent, reason: REASONS.cancelOpen });
  };

  useEffect(
    ([isOpenedByThisTriggerValue, storeValue]) => {
      const doc = ownerDocument(triggerElement);

      if (
        isOpenedByThisTriggerValue &&
        storeValue.select('lastOpenChangeReason') === REASONS.triggerHover
      ) {
        doc.addEventListener('mouseup', handleDocumentMouseUp, { once: true });

        return () => {
          doc.removeEventListener('mouseup', handleDocumentMouseUp);
        };
      }

      return undefined;
    },
    () => [isOpenedByThisTrigger(), store()] as const,
  );

  // Port note: inserting Solid's sibling focus guards can move the focused trigger in
  // the DOM. Preserve a hover opener's focus after that insertion, as React does.
  useIsoLayoutEffect(
    ([opened, hadFocus]) => {
      const element = triggerElementRef.current;
      if (
        opened &&
        hadFocus &&
        element &&
        untrack(store).select('lastOpenChangeReason') === REASONS.triggerHover &&
        ownerDocument(element).activeElement === ownerDocument(element).body
      ) {
        element.focus({ preventScroll: true });
      }
    },
    () =>
      [
        isOpenedByThisTrigger(),
        // Port note: SSR has no document and no trigger element to preserve focus on.
        triggerElementRef.current != null &&
          triggerElementRef.current === ownerDocument(triggerElementRef.current).activeElement,
      ] as const,
  );

  const parentMenubarHasSubmenuOpen = () => isInMenubar && parent.context.hasSubmenuOpen;
  const openOnHover = () => componentProps.openOnHover ?? parentMenubarHasSubmenuOpen();

  // Whether to ignore clicks to open the menu.
  // `lastOpenChangeReason` doesn't need to be reactive here, as we need to run this
  // only when `isOpenedByThisTrigger` changes.
  const stickIfOpen = useStickIfOpen(isOpenedByThisTrigger, () =>
    untrack(store).select('lastOpenChangeReason'),
  );

  // Port note: the interaction hooks take their floating root context once, so they're created
  // again when the trigger moves to another store (upstream re-renders them with the new context).
  const interactions = createMemo(() => {
    const context = floatingRootContext();
    return untrack(() => ({
      hoverProps: useHoverReferenceInteraction(context, {
        get enabled() {
          return (
            openOnHover() &&
            !disabled() &&
            (!isInMenubar || (parentMenubarHasSubmenuOpen() && !isMountedByThisTrigger()))
          );
        },
        handleClose: safePolygon({ blockPointerEvents: !isInMenubar }),
        mouseOnly: true,
        move: false,
        get restMs() {
          return parent.type === undefined ? delay() : undefined;
        },
        get delay() {
          return { close: closeDelay() };
        },
        triggerElementRef,
        externalTree: floatingTreeRoot,
        get isActiveTrigger() {
          return isTriggerActive();
        },
        isClosing: () => store().select('transitionStatus') === 'ending',
      }),
      click: useClick(context, {
        get enabled() {
          return !disabled();
        },
        get event() {
          return isOpenedByThisTrigger() && isInMenubar ? 'click' : 'mousedown';
        },
        toggle: true,
        ignoreMouse: false,
        get stickIfOpen() {
          return parent.type === undefined ? stickIfOpen() : false;
        },
      }),
      focus: useFocus(context, {
        get enabled() {
          return !disabled() && parentMenubarHasSubmenuOpen();
        },
      }),
    }));
  });

  const mixedToggleHandlers = useMixedToggleClickHandler({
    get open() {
      return isOpenedByThisTrigger();
    },
    enabled: isInMenubar,
    mouseDownAction: 'open',
  });

  const localInteractionProps = () =>
    mergeProps(
      interactions().focus.reference as HTMLProps,
      interactions().click.reference as HTMLProps,
    );

  const rootTriggerProps = useStoreState('triggerProps', isMountedByThisTrigger);
  // A filterable menu keeps real focus inside its popup and publishes what its trigger needs.
  const filterTriggerProps = useStoreState('filterTriggerProps');

  // Port note: reads the current store when the guards are focused.
  const { handlePreFocusGuardFocus, handleFocusTargetFocus } = useTriggerFocusGuards(
    {
      setOpen: (open, eventDetails) => store().setOpen(open, eventDetails),
      select: (key) => store().select(key),
      get context() {
        return store().context;
      },
    },
    triggerElementRef,
  );

  const state = createMemo<MenuTriggerState>(() => ({
    disabled: disabled(),
    open: isOpenedByThisTrigger(),
  }));

  const ref = [
    (element: HTMLElement | null) => {
      triggerElement = element;
    },
    buttonRef,
    registerTrigger,
    (element: HTMLElement | null) => {
      triggerElementRef.current = element;
    },
  ];
  const props = () => [
    localInteractionProps(),
    interactions().hoverProps() ?? EMPTY_OBJECT,
    rootTriggerProps(),
    {
      'aria-haspopup': 'menu' as const,
      'aria-controls': controlsId(),
      id: thisTriggerId(),
      onMouseDown: (event: MouseEvent) => {
        const currentStore = untrack(store);
        if (currentStore.select('open')) {
          return;
        }

        // mousedown -> mouseup on menu item should not trigger it within 200ms.
        allowMouseUpTriggerTimeout.start(200, () => {
          currentStore.context.allowMouseUpTriggerRef.current = true;
        });

        const doc = ownerDocument(event.currentTarget as Element);
        doc.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
      },
    },
    filterTriggerProps(),
    isInMenubar ? { role: 'menuitem' } : {},
    mixedToggleHandlers,
    elementProps,
    getButtonProps,
  ];

  // Port note: this branch depends only on context presence, which is fixed at mount.
  if (isInMenubar) {
    // eslint-disable-next-line solid/components-return-once
    return (
      <CompositeItem
        tag="button"
        render={componentProps.render}
        class={componentProps.class}
        style={componentProps.style}
        state={state()}
        refs={ref}
        props={props()}
        stateAttributesMapping={pressableTriggerOpenStateMapping}
      />
    );
  }

  const element = useRenderElement('button', componentProps, {
    stateAttributesMapping: pressableTriggerOpenStateMapping,
    state,
    ref,
    props,
  });

  // Port note: inserting conditional guards in a Solid fragment can move the trigger,
  // cancelling a native press-drag-release click. Insert siblings around the stable node
  // in the layout effect instead, preserving React's keyed fragment behavior.
  useIsoLayoutEffect(
    ([isOpened, currentStore]) => {
      const triggerNode = triggerElement;
      const parentNode = triggerNode?.parentNode;
      if (!isOpened || !triggerNode || !parentNode) {
        return undefined;
      }
      return createRoot((dispose) => {
        const before = TriggerFocusGuard({
          guardRef: currentStore.context.beforeTriggerFocusGuardRef,
          onFocus: handlePreFocusGuardFocus,
        }) as HTMLElement;
        const after = TriggerFocusGuard({
          guardRef: currentStore.context.triggerFocusTargetRef,
          onFocus: handleFocusTargetFocus,
        }) as HTMLElement;
        parentNode.insertBefore(before, triggerNode);
        parentNode.insertBefore(after, triggerNode.nextSibling);
        return () => {
          before.remove();
          after.remove();
          dispose();
        };
      });
    },
    () => [isOpenedByThisTrigger(), store()] as const,
  );

  return element;
}

/**
 * Port note: `store.useState(key, ...args)` for a store that may change. The returned reader
 * subscribes to the current store and follows the store accessor.
 */
function createStoreStateReader<Store extends Pick<MenuHandleStore<unknown>, 'useState'>>(
  store: Accessor<Store>,
): Store['useState'] {
  return ((key: string, ...args: unknown[]) => {
    const state = createMemo(() => {
      const currentStore = store() as any;
      return untrack(() => currentStore.useState(key, ...args) as Accessor<unknown>);
    });
    return () => state()();
  }) as Store['useState'];
}

/**
 * Port note: a `FocusGuard` whose ref object is reset to `null` when it unmounts, like React does
 * for ref objects.
 */
function TriggerFocusGuard(props: {
  guardRef: RefObject<HTMLElement | null>;
  onFocus: (event: FocusEvent) => void;
}) {
  const guardRef = untrack(() => props.guardRef);
  onCleanup(() => {
    if (guardRef.current !== null) {
      guardRef.current = null;
    }
  });
  return (
    <FocusGuard
      ref={(element) => {
        guardRef.current = element;
      }}
      onFocus={(event) => props.onFocus(event)}
    />
  );
}

export interface MenuTrigger {
  <Payload>(componentProps: MenuTriggerProps<Payload>): JSX.Element;
}

export interface MenuTriggerProps<Payload = unknown>
  extends NativeButtonProps, Omit<BaseUIComponentProps<'button', MenuTriggerState>, 'disabled'> {
  children?: JSX.Element | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  // Port note: declared here so it's a `boolean` (Solid's `disabled` attribute type also allows
  // `""`); upstream inherits it from React's button props.
  disabled?: boolean | undefined;
  /**
   * A handle to associate the trigger with a menu.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * A payload to pass to the menu when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * How long to wait before the menu may be opened on hover. Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 100
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * Whether the menu should also open when the trigger is hovered.
   */
  openOnHover?: boolean | undefined;
}

export interface MenuTriggerState {
  /**
   * Whether the menu is currently open and was opened by this trigger.
   */
  open: boolean;
  /**
   * Whether the trigger is disabled.
   */
  disabled: boolean;
}

export namespace MenuTrigger {
  export type Props<Payload = unknown> = MenuTriggerProps<Payload>;
  export type State = MenuTriggerState;
}

/**
 * Determines whether to ignore clicks after a hover-open.
 *
 * Port note: `open` and `openReason` are accessors; returns an accessor.
 */
function useStickIfOpen(open: Accessor<boolean>, openReason: Accessor<string | null>) {
  const stickIfOpenTimeout = useTimeout();
  const [stickIfOpen, setStickIfOpen] = createSignal(false);

  useIsoLayoutEffect(
    ([openValue]) => {
      const openReasonValue = openReason();
      if (openValue && openReasonValue === REASONS.triggerHover) {
        // Only allow "patient" clicks to close the menu if it's open.
        // If they clicked within 500ms of the menu opening, keep it open.
        setStickIfOpen(true);
        stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
          setStickIfOpen(false);
        });
      } else if (!openValue) {
        stickIfOpenTimeout.clear();
        setStickIfOpen(false);
      }
    },
    () => [open()] as const,
  );

  return stickIfOpen;
}

function useMenuParent() {
  const menubarContext = useMenubarContext(true);

  // Port note: computed once; it only depends on the presence of the menubar context.
  const parent: MenuParent = menubarContext
    ? {
        type: 'menubar',
        context: menubarContext,
      }
    : {
        type: undefined,
      };

  return parent;
}
