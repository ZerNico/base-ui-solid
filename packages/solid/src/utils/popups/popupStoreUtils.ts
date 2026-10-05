import { createMemo, flush, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { SolidStore } from '@base-ui-solid/utils/store';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useId } from '@base-ui-solid/utils/useId';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { FOCUSABLE_ATTRIBUTE } from '../../floating-ui-solid/utils/constants';
import { useFloatingParentNodeId } from '../../floating-ui-solid/components/FloatingTree';
import { useSyncedFloatingRootContext } from '../../floating-ui-solid/hooks/useSyncedFloatingRootContext';
import type { SyncedFloatingRootContextStore } from '../../floating-ui-solid/hooks/useSyncedFloatingRootContext';
import { useUnmountAfterClose } from '../../internals/useUnmountAfterClose';
import type { HTMLProps } from '../../internals/types';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type {
  PopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupTriggerDataStore,
} from './store';

export const FOCUSABLE_POPUP_PROPS = {
  tabindex: -1,
  [FOCUSABLE_ATTRIBUTE]: '',
} satisfies HTMLProps<HTMLElement> & Record<typeof FOCUSABLE_ATTRIBUTE, string>;

/**
 * Returns the default `initialFocus` resolver for a popup. When opened by touch it focuses the
 * popup element itself to prevent the virtual keyboard from opening (required for Android
 * specifically; iOS handles this automatically). Otherwise it falls back to the default behavior.
 */
export function createDefaultInitialFocus(popupRef: RefObject<HTMLElement | null>) {
  return (interactionType: InteractionType) =>
    interactionType === 'touch' ? popupRef.current : true;
}

type PopupStoreWithOpen<
  State extends PopupStoreState<unknown>,
  SetOpenEventDetails extends BaseUIChangeEventDetails<string>,
> = PopupTriggerDataStore<State> &
  Pick<SyncedFloatingRootContextStore<State>, 'useSyncedValue'> & {
    setOpen(open: boolean, eventDetails: SetOpenEventDetails): void;
  };

/**
 * The subset of a popup handle that a Root needs to bind its store to. Both the real handle classes
 * and any test double satisfy it.
 */
export interface PopupRootStoreHandle<Store> {
  attachStore(store: Store): () => void;
}

/**
 * Creates and owns a popup store on behalf of a Root part. The store is created exactly once, with
 * controlled props and root state synced separately after creation. Sets up the synced floating
 * root context and returns the store.
 *
 * @param createStore Factory that builds the store. Called exactly once, receiving the floating id
 * and whether the popup is nested inside another floating element, both resolved on the first render.
 * @param treatPopupAsFloatingElement Whether the popup element is passed to Floating UI as the
 * floating element instead of the default positioner.
 */
export function usePopupRootStore<
  State extends PopupStoreState<unknown>,
  SetOpenEventDetails extends BaseUIChangeEventDetails<string>,
  Store extends PopupStoreWithOpen<State, SetOpenEventDetails>,
>(
  createStore: (floatingId: string | undefined, nested: boolean) => Store,
  treatPopupAsFloatingElement = false,
): Store {
  const floatingId = useId();
  const nested = useFloatingParentNodeId() != null;

  const store = untrack(() => createStore(floatingId, nested));

  useSyncedFloatingRootContext({
    popupStore: store,
    treatPopupAsFloatingElement,
    floatingRootContext: store.state.floatingRootContext,
    floatingId,
    nested,
    onOpenChange: store.setOpen,
  });

  return store;
}

/**
 * Attaches a Root's store to a handle for this component's committed lifetime. Popup Roots render
 * it before their interactions and user children so its layout effect runs before descendant layout
 * effects. This lets descendants call the handle during the Root's initial commit without attaching
 * during render, which would leak suspended or abandoned stores. Store subscribers are notified by
 * `attachStore` in this ordinary layout phase, where React permits synchronous updates.
 *
 * Popup Roots must render this component only when a handle is present so handle-less Roots avoid
 * mounting an extra fiber and layout effect.
 */
export function PopupHandleAttachment<Store>(props: {
  handle: PopupRootStoreHandle<Store>;
  store: Store;
}) {
  useIsoLayoutEffect(
    ([handle, store]) => {
      return handle.attachStore(store);
    },
    () => [props.handle, props.store] as const,
  );

  return null;
}

/**
 * Port note: hook counterpart of `<PopupHandleAttachment>` for a handle that may be absent. Call it
 * in the Root body (before rendering children): Solid creates a component's JSX children after its
 * later siblings, so an effect created by a child component would run after those siblings'
 * effects, while an effect created in the Root body runs before every descendant's and later
 * sibling's effect, like upstream's first-child layout effect.
 */
export function usePopupHandleAttachment<Store>(
  handle: Accessor<PopupRootStoreHandle<Store> | undefined>,
  store: Store,
) {
  useIsoLayoutEffect(
    ([handleValue]) => handleValue?.attachStore(store),
    () => [handle()] as const,
  );
}

/**
 * A value, or an accessor returning it.
 * Port note: trigger hooks accept accessors for values that upstream reads on every render (a
 * detached trigger follows its handle's store pointer, and its id may come from props).
 */
export type MaybeAccessor<T> = T | Accessor<T>;

function read<T>(value: MaybeAccessor<T>): T {
  return typeof value === 'function' ? (value as Accessor<T>)() : value;
}

/**
 * `store.useState(key, ...args)` for a store that may change.
 */
function useMaybeAccessorStoreState<State extends PopupStoreState<unknown>>(
  store: MaybeAccessor<PopupTriggerDataStore<State>>,
  key: 'isMountedByTrigger',
  triggerId: MaybeAccessor<string | undefined>,
): Accessor<boolean> {
  if (typeof store !== 'function') {
    return store.useState(key, triggerId);
  }
  const state = createMemo(() => store().useState(key, triggerId));
  return () => state()();
}

function syncTriggerCount(store: PopupTriggerDataStore<PopupStoreState<unknown>>) {
  const triggerCount = store.context.triggerElements.size;
  if (store.select('open') && store.state.triggerCount !== triggerCount) {
    store.set('triggerCount', triggerCount);
  }
}

/**
 * Returns a stable callback ref that registers/unregisters the trigger element in the store.
 *
 * Stable so a downstream ref merger that retains the callback it was first given still reaches the
 * trigger's current store. The registration is tracked as a `(store, id, element)` triple, so
 * unregistering targets the store the element was actually registered in.
 *
 * Since the callback never changes, the caller must re-run it from a layout effect keyed on
 * `[store, id]` to migrate an already-registered element. That effect is also what registers the
 * element in the first place when `id` only resolves after the first commit (React 17's `useId`
 * fallback), because the register call made while the id is still `undefined` does nothing.
 *
 * @param id Id of the trigger.
 * @param store The Store instance where the trigger should be registered.
 */
export function useTriggerRegistration<State extends PopupStoreState<unknown>>(
  idParam: MaybeAccessor<string | undefined>,
  storeParam: MaybeAccessor<PopupTriggerDataStore<State>>,
) {
  const registrationRef: {
    current: {
      store: PopupTriggerDataStore<State>;
      id: string;
      element: Element;
    } | null;
  } = { current: null };

  return (element: Element | null) => {
    const id = untrack(() => read(idParam));
    const store = untrack(() => read(storeParam));
    const registration = registrationRef.current;

    if (registration !== null) {
      if (
        registration.element === element &&
        registration.store === store &&
        registration.id === id
      ) {
        // Already registered where it belongs, so the caller's migration effect is free on mount.
        return;
      }

      registrationRef.current = null;
      const registeredStore = registration.store;
      if (
        registeredStore.context.triggerElements.getById(registration.id) === registration.element
      ) {
        registeredStore.context.triggerElements.delete(registration.id);
        syncTriggerCount(registeredStore);
      }
    }

    if (element !== null && id !== undefined) {
      registrationRef.current = { store, id, element };
      store.context.triggerElements.add(id, element);
      syncTriggerCount(store);
    }
  };
}

type PopupOpenState = Pick<
  PopupStoreState<unknown>,
  | 'open'
  | 'preventUnmountingOnClose'
  | 'activeTriggerId'
  | 'activeTriggerElement'
  | 'openedWithoutTrigger'
>;

export function createPopupOpenState(
  state: PopupOpenState,
  open: boolean,
  trigger: Element | undefined,
  preventUnmountOnClose = false,
): PopupOpenState {
  let preventUnmountingOnClose = state.preventUnmountingOnClose;
  if (open) {
    // Opening starts a new close cycle, so clear any previous request to keep the popup mounted.
    preventUnmountingOnClose = false;
  } else if (preventUnmountOnClose) {
    preventUnmountingOnClose = true;
  }

  const triggerId = trigger?.id ?? null;
  let activeTriggerId = state.activeTriggerId;
  let activeTriggerElement = state.activeTriggerElement;

  // If a popup is closing, the `trigger` may be undefined.
  // We want to keep the previous value so that exit animations are played and focus is returned correctly.
  if (triggerId || open) {
    activeTriggerId = triggerId;
    activeTriggerElement = trigger ?? null;
  }

  return {
    open,
    preventUnmountingOnClose,
    activeTriggerId,
    activeTriggerElement,
    // An open request without a trigger (a handle's `open(null)` or `openWithPayload()`) must not
    // be reassociated with a lone registered trigger later on. Controlled and default opens never
    // pass through here, so they keep claiming a lone trigger. A close request keeps the flag: a
    // controlled root may decline it and stay open, so the Root clears the flag only once the
    // popup is effectively closed.
    openedWithoutTrigger: open ? trigger == null : state.openedWithoutTrigger,
  };
}

export function attachPreventUnmountOnClose(eventDetails: { preventUnmountOnClose(): void }) {
  let preventUnmountOnClose = false;

  eventDetails.preventUnmountOnClose = () => {
    preventUnmountOnClose = true;
  };

  return () => preventUnmountOnClose;
}

/**
 * Runs the shared open-change sequence for a popup store: notifies `onOpenChange`,
 * honors cancellation, dispatches the floating root change, maps the reason to an
 * `instantType`, and commits the state update (synchronously for hover so
 * `getAnimations()` observes it). Stores supply their own differences via
 * `extraState` (e.g. the last change reason) and `onBeforeDispatch` (e.g. updating
 * inline-rect coordinates).
 */
export function applyPopupOpenChange<
  State extends PopupStoreState<unknown> & {
    instantType?: 'delay' | 'dismiss' | 'focus' | undefined;
  },
  EventDetails extends BaseUIChangeEventDetails<string>,
  ExtraKey extends keyof State = never,
>(
  store: {
    readonly context: Pick<PopupStoreContext<EventDetails>, 'onOpenChange'>;
    readonly state: State;
    update<const Key extends keyof State>(state: Pick<State, Key>): void;
  },
  nextOpen: boolean,
  eventDetails: EventDetails & { preventUnmountOnClose(): void },
  options: {
    onBeforeDispatch?: (() => void) | undefined;
    extraState?: Pick<State, ExtraKey> | undefined;
  } = {},
): void {
  const reason = eventDetails.reason;
  const isHover = reason === REASONS.triggerHover;
  const isFocusOpen = nextOpen && reason === REASONS.triggerFocus;
  const isDismissClose =
    !nextOpen && (reason === REASONS.triggerPress || reason === REASONS.escapeKey);

  const shouldPreventUnmountOnClose = attachPreventUnmountOnClose(eventDetails);

  store.context.onOpenChange?.(nextOpen, eventDetails);

  if (eventDetails.isCanceled) {
    return;
  }

  options.onBeforeDispatch?.();

  store.state.floatingRootContext.dispatchOpenChange(nextOpen, eventDetails);

  const changeState = () => {
    const popupOpenState = createPopupOpenState(
      store.state,
      nextOpen,
      eventDetails.trigger,
      shouldPreventUnmountOnClose(),
    );

    const updatedState = { ...options.extraState, ...popupOpenState } as Pick<
      State,
      keyof PopupOpenState | ExtraKey | 'instantType'
    >;

    if (isFocusOpen) {
      updatedState.instantType = 'focus';
    } else if (isDismissClose) {
      updatedState.instantType = 'dismiss';
    } else if (isHover) {
      updatedState.instantType = undefined;
    }

    store.update(updatedState);
  };

  if (isHover) {
    // Flush synchronously for hover so `node.getAnimations()` sees the new state.
    changeState();
    flush();
  } else {
    changeState();
  }
}

/**
 * Sets up trigger data forwarding to the store.
 *
 * Port note: `triggerId` and `store` may be accessors, `stateUpdates` is an accessor returning the
 * state part. Returns `isMountedByThisTrigger` as an accessor.
 *
 * @param triggerId Id of the trigger.
 * @param triggerElementRef Ref for the trigger DOM element.
 * @param store The Store instance managing the popup state.
 * @param stateUpdates An object with state updates to apply when the trigger is active.
 */
export function useTriggerDataForwarding<
  State extends PopupStoreState<unknown>,
  const Key extends keyof Omit<State, 'activeTriggerId' | 'activeTriggerElement'>,
>(
  triggerIdParam: MaybeAccessor<string | undefined>,
  triggerElementRef: RefObject<Element | null>,
  storeParam: MaybeAccessor<PopupTriggerDataStore<State>>,
  stateUpdatesParam: Accessor<Pick<State, Key>>,
) {
  const isMountedByThisTrigger = useMaybeAccessorStoreState(
    storeParam,
    'isMountedByTrigger',
    triggerIdParam,
  );

  const baseRegisterTrigger = useTriggerRegistration(triggerIdParam, storeParam);

  // Applies trigger-owned state (active-trigger ownership and payload) when the trigger registers.
  // Stable so payload/`stateUpdates` changes do not change the ref identity (which would needlessly
  // churn registration); it reads the latest values when invoked.
  const applyTriggerData = (element: Element) => {
    const store = untrack(() => read(storeParam));
    const triggerId = untrack(() => read(triggerIdParam));
    const stateUpdates = untrack(stateUpdatesParam);
    const open = store.select('open');
    const activeTriggerId = store.select('activeTriggerId');

    if (activeTriggerId === triggerId) {
      const changes = {
        activeTriggerElement: element,
        ...(open ? stateUpdates : null),
      } as Pick<Readonly<State>, Key | 'activeTriggerElement'>;
      store.update(changes);
      return;
    }

    if (activeTriggerId == null && open && !store.state.openedWithoutTrigger) {
      // If a popup is already open, a detached trigger can mount before any active trigger
      // has been established. Claim the first registered trigger so trigger-owned focus
      // management and ARIA relationships work. A popup opened deliberately without a trigger
      // stays unassociated so the trigger's `payload` does not replace the programmatic one.
      const changes = {
        activeTriggerId: triggerId ?? null,
        activeTriggerElement: element,
        ...stateUpdates,
      } as Pick<Readonly<State>, Key | 'activeTriggerId' | 'activeTriggerElement'>;
      store.update(changes);
    }
  };

  // Stable, so the merged ref on the rendered element keeps its identity for the trigger's whole
  // lifetime.
  const registerTrigger = (element: Element | null) => {
    baseRegisterTrigger(element);
    if (element) {
      applyTriggerData(element);
    }
  };

  // A stable ref does not re-fire on a store or id change, so migrate here instead: unregister from
  // the previous store, then register the element the trigger still renders into the current one.
  useIsoLayoutEffect(
    () => {
      registerTrigger(triggerElementRef.current);
      return () => registerTrigger(null);
    },
    () => [triggerElementRef, read(storeParam), read(triggerIdParam)],
  );

  // Port note: upstream's dependencies are the values of `stateUpdates`; the accessor re-runs
  // exactly when one of them changes.
  useIsoLayoutEffect(
    ([isMounted, store, stateUpdates]) => {
      if (isMounted) {
        const changes = {
          activeTriggerElement: triggerElementRef.current,
          ...stateUpdates,
        } as Pick<Readonly<State>, Key | 'activeTriggerElement'>;
        store.update(changes);
      }
    },
    () =>
      [isMountedByThisTrigger(), read(storeParam), stateUpdatesParam(), triggerElementRef] as const,
  );

  return { registerTrigger, isMountedByThisTrigger };
}

/**
 * A Root's `children` render function.
 *
 * Port note: upstream passes `{ payload }` with the current payload on every render. Solid calls
 * the function once, so `payload` is an accessor, like the item accessor of Solid's `<For>`: the
 * argument can be destructured (`({ payload }) => …`) and `payload()` read in a reactive scope.
 */
export type PayloadChildRenderFunction<Payload> = (arg: {
  payload: Accessor<Payload | undefined>;
}) => JSX.Element;

/**
 * Keeps trigger registration state synchronized while the popup is open.
 *
 * When a popup opens without an explicit trigger id and exactly one trigger is registered, that
 * trigger is claimed as the active trigger, unless the open request deliberately carried no trigger
 * (`openedWithoutTrigger`). When the active trigger id is still registered but its
 * element changed, the active element is refreshed. When the active trigger id is missing from the
 * registry but the same element is still registered under a different id (e.g. the rendered trigger
 * carries its own DOM `id` that differs from Base UI's internal trigger id), the active id is
 * reassociated to the registered id instead of being treated as lost. When the active trigger
 * unregisters, the default path preserves existing ownership so non-closing popup families do not
 * silently claim a different trigger while staying open.
 *
 * If `closeOnActiveTriggerUnmount` is enabled, unregistering a previously resolved active trigger
 * requests a close after a microtask so a same-tick replacement trigger with the same id can
 * register first. An active trigger id that has not matched a registered trigger yet is treated as
 * pending and does not request a close.
 *
 * This should be called on the Root part.
 *
 * @param store The Store instance managing the popup state.
 * @param options Options for active trigger unmount behavior.
 */
export function useImplicitActiveTrigger<State extends PopupStoreState<unknown>>(
  store: PopupStoreWithOpen<State, BaseUIChangeEventDetails<typeof REASONS.none>>,
  options: {
    closeOnActiveTriggerUnmount?: boolean | undefined;
  } = {},
) {
  const { closeOnActiveTriggerUnmount = false } = options;
  // Distinguishes a trigger that unmounted from a new active trigger that has not hydrated yet.
  const resolvedActiveTriggerIdRef: { current: string | null } = { current: null };
  const open = store.useState('open');
  const reactiveTriggerCount = store.useState('triggerCount');
  // Subscribe to the active trigger id so the reconciliation below reruns when ownership moves to
  // another trigger while the popup stays open (e.g. a focus/hover handoff between triggers).
  const activeTriggerId = store.useState('activeTriggerId');
  // Subscribe to the active trigger element so the reconciliation reruns when a pending active
  // trigger registers in a commit where the trigger count nets out unchanged (registration
  // forwards the element to the store when the registering trigger matches the active id).
  // Without this, the id would never be marked resolved and a later genuine unmount would be
  // misclassified as pending, disabling `closeOnActiveTriggerUnmount`.
  const reactiveActiveTriggerElement = store.useState('activeTriggerElement');

  useIsoLayoutEffect(
    ([openValue]) => {
      if (!openValue) {
        resolvedActiveTriggerIdRef.current = null;
        if (store.state.triggerCount !== 0) {
          store.set('triggerCount', 0);
        }
        // The flag is cleared only here, once the popup is effectively closed: a controlled root may
        // decline a close request and stay open, and a controlled close never reaches
        // `createPopupOpenState` at all.
        if (store.state.openedWithoutTrigger) {
          store.set('openedWithoutTrigger', false);
        }
        return;
      }

      const triggerCount = store.context.triggerElements.size;
      const stateUpdates = {} as Pick<
        State,
        'triggerCount' | 'activeTriggerId' | 'activeTriggerElement'
      >;

      if (store.state.triggerCount !== triggerCount) {
        stateUpdates.triggerCount = triggerCount;
      }

      const currentActiveTriggerId = store.select('activeTriggerId');
      let lostActiveTriggerId: string | null = null;

      if (currentActiveTriggerId) {
        const activeTriggerElement = store.context.triggerElements.getById(currentActiveTriggerId);
        if (!activeTriggerElement) {
          for (const [triggerId, triggerElement] of store.context.triggerElements.entries()) {
            if (triggerElement === store.state.activeTriggerElement) {
              stateUpdates.activeTriggerId = triggerId;
              stateUpdates.activeTriggerElement = triggerElement;
              resolvedActiveTriggerIdRef.current = triggerId;
              break;
            }
          }

          if (stateUpdates.activeTriggerId === undefined) {
            if (resolvedActiveTriggerIdRef.current === currentActiveTriggerId) {
              lostActiveTriggerId = currentActiveTriggerId;
            } else {
              resolvedActiveTriggerIdRef.current = null;
            }
          }
        } else {
          resolvedActiveTriggerIdRef.current = currentActiveTriggerId;
          if (activeTriggerElement !== store.state.activeTriggerElement) {
            stateUpdates.activeTriggerElement = activeTriggerElement;
          }
        }
      } else {
        resolvedActiveTriggerIdRef.current = null;
      }

      if (
        !lostActiveTriggerId &&
        !currentActiveTriggerId &&
        !store.state.openedWithoutTrigger &&
        triggerCount === 1
      ) {
        const iteratorResult = store.context.triggerElements.entries().next();
        if (!iteratorResult.done) {
          const [implicitTriggerId, implicitTriggerElement] = iteratorResult.value;
          stateUpdates.activeTriggerId = implicitTriggerId;
          stateUpdates.activeTriggerElement = implicitTriggerElement;
          resolvedActiveTriggerIdRef.current = implicitTriggerId;
        }
      }

      if (
        stateUpdates.triggerCount !== undefined ||
        stateUpdates.activeTriggerId !== undefined ||
        stateUpdates.activeTriggerElement !== undefined
      ) {
        store.update(stateUpdates);
      }

      if (lostActiveTriggerId) {
        if (closeOnActiveTriggerUnmount) {
          // Defer so a same-tick replacement trigger with the same id can register first.
          queueMicrotask(() => {
            if (
              store.select('open') &&
              store.select('activeTriggerId') === lostActiveTriggerId &&
              !store.context.triggerElements.getById(lostActiveTriggerId)
            ) {
              const eventDetails = createChangeEventDetails(REASONS.none);
              store.setOpen(false, eventDetails);
              // If closing is canceled, keep the previous active trigger ownership for the
              // still-open popup instead of claiming another trigger implicitly.
              if (!eventDetails.isCanceled) {
                store.update({
                  activeTriggerId: null,
                  activeTriggerElement: null,
                });
              }
            }
          });
        }
      }
    },
    () => [open(), reactiveTriggerCount(), activeTriggerId(), reactiveActiveTriggerElement()],
  );
}

/**
 * Manages the mounted state of the popup.
 * Sets up the transition status listeners and handles unmounting when needed.
 * Updates the `mounted`, `transitionStatus`, and `preventUnmountingOnClose` states in the store.
 *
 * @param open Whether the popup is open.
 * @param store The Store instance managing the popup state.
 * @param onUnmount Optional callback to be called when the popup is unmounted.
 * @param animateInitialOpen Whether a popup that mounts already open should still play its enter
 *   transition. Defaults to `false`, so content that was open on the first render (a `defaultOpen`
 *   popup on page load, SSR'd markup) appears without animating. Opt in for popups whose subtree
 *   only mounts in response to something the user did, such as a submenu inside a menu popup.
 *
 * @returns A function to forcibly unmount the popup. It is a no-op once the popup is already
 *   unmounted, so calling it after the automatic unmount doesn't repeat the completion callback.
 */
export function useOpenStateTransitions<State extends PopupStoreState<unknown>>(
  open: Accessor<boolean>,
  store: SolidStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>,
  onUnmount?: () => void,
  animateInitialOpen?: boolean,
) {
  const { mounted, transitionStatus, forceUnmount } = useUnmountAfterClose({
    open,
    ref: store.context.popupRef,
    preventUnmountOnClose: store.useState('preventUnmountingOnClose'),
    setPreventUnmountOnClose: (preventUnmountOnClose) =>
      store.set('preventUnmountingOnClose', preventUnmountOnClose),
    animateInitialOpen,
    onUnmount() {
      store.update({
        activeTriggerId: null,
        activeTriggerElement: null,
        mounted: false,
        preventUnmountingOnClose: false,
      });
      onUnmount?.();
      store.context.onOpenChangeComplete?.(false);
    },
  });

  // Seed the Root-owned store before parts subscribe, matching the hook's initial mounted state.
  // Otherwise, an initially open Root looks like a reopen until the layout effect syncs the store.
  // Port note: kept for parity with upstream. `useSyncedValues` below registers `mounted` as the
  // store's source, so the parts already read it on their first render.
  store.set('mounted', untrack(mounted));

  store.useSyncedValues(() => ({ mounted: mounted(), transitionStatus: transitionStatus() }));

  return { forceUnmount, transitionStatus };
}

type PopupInteractionPropKey = 'activeTriggerProps' | 'inactiveTriggerProps' | 'popupProps';

export function usePopupInteractionProps<
  State extends PopupStoreState<unknown>,
  const Key extends keyof State,
>(
  store: SolidStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>,
  statePart: Accessor<Pick<State, Key | PopupInteractionPropKey>>,
) {
  store.useSyncedValues(statePart);

  useIsoLayoutEffect(
    () => () => {
      store.update({
        activeTriggerProps: EMPTY_OBJECT,
        inactiveTriggerProps: EMPTY_OBJECT,
        popupProps: EMPTY_OBJECT,
      });
    },
    () => [store],
  );
}

export function usePopupRootSync<
  State extends PopupStoreState<unknown> & {
    openMethod: InteractionType | null;
  },
>(
  store: SolidStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>,
  open: Accessor<boolean>,
) {
  useIsoLayoutEffect(
    ([openValue]) => {
      if (!openValue && store.state.openMethod !== null) {
        store.set('openMethod', null);
      }
    },
    () => [open()],
  );

  useIsoLayoutEffect(
    () => () => {
      if (store.state.openMethod !== null) {
        store.set('openMethod', null);
      }
    },
    () => [store],
  );
}
