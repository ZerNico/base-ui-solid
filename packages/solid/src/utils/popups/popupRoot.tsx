import { createMemo, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { SolidStore } from '@base-ui-solid/utils/store';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useId } from '@base-ui-solid/utils/useId';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useFloatingParentNodeId } from './tree/FloatingTree';
import { useUnmountAfterClose } from '../../internals/useUnmountAfterClose';
import { useImperativeHandle } from '../../internals/useImperativeHandle';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type {
  BasePopupStore,
  PopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupTriggerDataStore,
} from './store';

/**
 * The props every popup Root shares.
 *
 * Port note: `actionsRef` is a callback (see `useImperativeHandle`).
 */
export interface PopupRootProps<Store extends PopupRootStore> {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: Store['context']['onOpenChange'] | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  actionsRef?: ((actions: PopupRootActions) => void) | undefined;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
}

export interface PopupRootActions {
  unmount: () => void;
  close: () => void;
}

/**
 * The store state a popup Root derives from its props when it creates the store.
 */
export type PopupRootInitialState = Pick<
  PopupStoreState<unknown>,
  'open' | 'openProp' | 'activeTriggerId' | 'triggerIdProp'
>;

/**
 * Port note: the options are read once, except `disabled`, which is an accessor.
 */
export interface UsePopupRootOptions {
  /**
   * Whether the popup closes when its active trigger unmounts.
   * @default false
   */
  closeOnActiveTriggerUnmount?: boolean | undefined;
  /**
   * Whether a popup that mounts already open still plays its enter transition.
   * See `useOpenStateTransitions`.
   * @default false
   */
  animateInitialOpen?: boolean | undefined;
  /**
   * Whether the popup renders as closed. Its open state in the store is left as it is.
   * @default false
   */
  disabled?: Accessor<boolean> | undefined;
}

/**
 * The popup store members a popup Root relies on.
 *
 * Port note: a `BasePopupStore`. The Root also derives the state upstream writes from effects
 * (`useDerivedState`, `useResetState`, `useAnchorState`), and `SolidStore` compares its state type
 * strictly, so a narrower store type than upstream's wouldn't accept the popup stores.
 */
type PopupRootStore = BasePopupStore<any, any, any, any>;

/**
 * Runs what every popup Root does for its popup, in the order it needs: it creates the store,
 * syncs the controlled props and callbacks, keeps the active trigger current, runs the open and
 * close transitions, and exposes the `actionsRef` actions.
 *
 * Port note: `props` is read lazily (pass the component's props, don't destructure them). The
 * returned `open`, `mounted`, `payload` and `transitionStatus` are accessors.
 *
 * @param props The props every popup Root shares.
 * @param createStore Builds the store exactly once, from the state the props describe and the
 *   default popup id. The store belongs to the
 *   Root, not to its handle: the handle attaches to it, so swapping the handle re-attaches rather
 *   than recreating state. The props only seed it; controlled props are synced after creation.
 * @param options What differs between popup Roots.
 * @returns The store, and the open and mounted state, payload and transition status it renders.
 */
export function usePopupRoot<Store extends PopupRootStore>(
  props: PopupRootProps<Store>,
  createStore: (initialState: PopupRootInitialState, defaultPopupId: string | undefined) => Store,
  options: UsePopupRootOptions = {},
) {
  const defaultPopupId = useId();
  return usePopupRootWithPopupId(props, createStore, () => defaultPopupId, options);
}

/**
 * `usePopupRoot` for a Root that supplies its own default popup id instead of a generated one.
 *
 * @param defaultPopupId The default popup id, or `undefined` to leave the popup without one.
 *   Port note: an accessor, since Menu's default popup id follows the id its popup renders.
 */
export function usePopupRootWithPopupId<Store extends PopupRootStore>(
  props: PopupRootProps<Store>,
  createStore: (initialState: PopupRootInitialState, defaultPopupId: string | undefined) => Store,
  defaultPopupId: Accessor<string | undefined>,
  options: UsePopupRootOptions = {},
) {
  const {
    closeOnActiveTriggerUnmount = false,
    animateInitialOpen = false,
    disabled = () => false,
  } = options;

  const store = usePopupRootStore(
    (initialPopupId) =>
      createStore(
        untrack(() => ({
          open: props.defaultOpen ?? false,
          openProp: props.open,
          activeTriggerId: props.defaultTriggerId ?? null,
          triggerIdProp: props.triggerId,
        })),
        initialPopupId,
      ),
    defaultPopupId,
  );

  const transitionOpen = usePopupRootOpenState(store, props, disabled);
  store.useControlledProp('triggerIdProp', () => props.triggerId);
  // Root logic reads the open state from the store, in step with the active trigger and the other
  // values it syncs there. Only the transitions read the controlled prop as soon as it changes.
  const openState = store.useState('open');
  const open = createMemo(() => !disabled() && openState());
  const mounted = store.useState('mounted');
  const payload = store.useState('payload') as Accessor<Store['state']['payload']>;

  useImplicitActiveTrigger(store, { closeOnActiveTriggerUnmount });
  const transitionStatus = usePopupRootTransitions(
    store,
    transitionOpen,
    props,
    animateInitialOpen,
  );

  return { store, open, mounted, payload, transitionStatus };
}

/**
 * `usePopupRoot` for a popup that has a single anchor and no triggers to track, such as a Select
 * or a Combobox: it leaves out the trigger props and the active trigger.
 *
 * Port note: `props` is read lazily, and the returned `open` and `transitionStatus` are accessors.
 *
 * @param popupRef The element whose closing animations are awaited before the popup unmounts.
 *   Defaults to the store's `popupRef`.
 */
export function useSingleAnchorPopupRoot<Store extends PopupRootStore>(
  props: Omit<PopupRootProps<Store>, 'triggerId' | 'defaultTriggerId'>,
  createStore: (initialState: PopupRootInitialState, defaultPopupId: string | undefined) => Store,
  popupRef?: RefObject<HTMLElement | null>,
) {
  const defaultPopupId = useId();
  const store = usePopupRootStore(
    (initialPopupId) =>
      createStore(
        untrack(() => ({
          open: props.defaultOpen ?? false,
          openProp: props.open,
          activeTriggerId: null,
          triggerIdProp: undefined,
        })),
        initialPopupId,
      ),
    () => defaultPopupId,
  );

  const open = usePopupRootOpenState(store, props, () => false);
  const transitionStatus = usePopupRootTransitions(store, open, props, false, popupRef);

  return { store, open, transitionStatus };
}

/**
 * Syncs the controlled `open` prop and the open change callbacks, and returns whether the popup
 * renders as open.
 */
function usePopupRootOpenState<Store extends PopupRootStore>(
  store: Store,
  props: Pick<PopupRootProps<Store>, 'open' | 'onOpenChange' | 'onOpenChangeComplete'>,
  disabled: Accessor<boolean>,
) {
  store.useControlledProp('openProp', () => props.open);

  store.useContextCallback('onOpenChange', () => props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', () => props.onOpenChangeComplete);

  const openState = store.useState('open');
  // The store receives a controlled `open` prop in a layout effect, a commit after the Root renders
  // with it, so the transitions read the prop itself.
  // Port note: the store derives the controlled prop with no lag, so this equals the store's
  // `open`. It's kept for parity.
  return createMemo(() => !disabled() && (props.open ?? openState()));
}

/**
 * Runs the open and close transitions and exposes the `actionsRef` actions.
 */
function usePopupRootTransitions<Store extends PopupRootStore>(
  store: Store,
  open: Accessor<boolean>,
  props: Pick<PopupRootProps<Store>, 'open' | 'actionsRef'>,
  animateInitialOpen: boolean,
  popupRef?: RefObject<HTMLElement | null>,
) {
  const { forceUnmount, transitionStatus } = useOpenStateTransitions(
    open,
    store,
    () => props.open,
    animateInitialOpen,
    popupRef,
  );

  useImperativeHandle(() => props.actionsRef, {
    unmount: forceUnmount,
    close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
  });

  return transitionStatus;
}

/**
 * Renders what a popup Root renders inside its context provider, in the order it needs:
 *
 * 1. The interactions.
 * 2. `children`, called with the payload when it's a function.
 *
 * It's a plain function rather than a component.
 *
 * Port note: upstream renders the handle attachment first. Solid creates a component's JSX
 * children after its later siblings, so the Root attaches the handle from its body instead
 * (`usePopupHandleAttachment`), and `store` and `handle` aren't parameters here. Call it inside the
 * provider's JSX, so the children are created under it.
 *
 * Port note: a render-function child is called once (React calls it on every render), with
 * `{ payload }` where `payload` is an accessor (see `PayloadChildRenderFunction`), so the argument
 * can be destructured. A single component child can also be a function (e.g. the accessor a
 * `<Show>` returns), so a function counts as a render function only when it declares a parameter,
 * like Solid's `<Show>` does for its function children.
 */
export function renderPopupRootChildren<Payload>(parameters: {
  interactions?: JSX.Element | undefined;
  children: JSX.Element | PayloadChildRenderFunction<Payload> | undefined;
  payload: Accessor<Payload | undefined>;
}): JSX.Element {
  const { interactions, children, payload } = parameters;

  const renderedChildren =
    typeof children === 'function' && children.length > 0
      ? untrack(() => (children as PayloadChildRenderFunction<Payload>)({ payload }))
      : (children as JSX.Element);

  return interactions === undefined ? renderedChildren : [interactions, renderedChildren];
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
 * The subset of a popup handle that a Root needs to bind its store to. Both the real handle classes
 * and any test double satisfy it.
 */
interface PopupRootStoreHandle<Store> {
  attachStore(store: Store): () => void;
}

/**
 * Creates and owns a popup store on behalf of a Root part. The store is created exactly once, with
 * controlled props and root state synced separately after creation. Keeps the default popup id and
 * whether the popup is nested current, and returns the store.
 *
 * @param createStore Factory that builds the store. Called exactly once, receiving the default popup id
 * resolved on the first render.
 * @param defaultPopupId The default popup id, or `undefined` to leave the popup without one.
 */
function usePopupRootStore<Store extends PopupRootStore>(
  createStore: (defaultPopupId: string | undefined) => Store,
  defaultPopupId: Accessor<string | undefined>,
): Store {
  const nested = useFloatingParentNodeId() != null;

  const store = untrack(() => createStore(defaultPopupId()));

  store.useSyncedValue('defaultPopupId', defaultPopupId);
  store.context.nested = nested;
  // Port note: upstream applies the anchor state in the store's `setState` (see `BasePopupStore`).
  store.useAnchorState();

  return store;
}

/**
 * Attaches a Root's store to a handle for this component's committed lifetime, so descendants can
 * call the handle during the Root's initial commit.
 *
 * Port note: counterpart of upstream's `<PopupHandleAttachment>`, which the Root renders before its
 * interactions and user children so its layout effect runs before descendant layout effects. Call
 * it in the Root body (before rendering children): Solid creates a component's JSX children after
 * its later siblings, so an effect created by a child component would run after those siblings'
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
  store: PopupTriggerDataStore<State> & {
    setOpen(open: boolean, eventDetails: BaseUIChangeEventDetails<typeof REASONS.none>): void;
    useDerivedState<Key extends keyof State>(
      key: Key,
      derive: (rawValue: State[Key], rawState: State, writes: number) => State[Key],
    ): void;
  },
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

  // Port note: derived instead of written from the effect below on every open and close.
  // `triggerCount` counts the registered triggers while the popup is open, and a popup opened
  // without a trigger (and no active trigger written) claims the lone registered trigger until it
  // unmounts.
  const triggerElements = store.context.triggerElements;
  // The flag only applies while the popup is effectively open: a controlled root may decline a
  // close request and stay open, and a controlled close never reaches `createPopupOpenState` at
  // all. The raw flag is cleared on unmount.
  store.useDerivedState('openedWithoutTrigger', (raw) => (store.select('open') ? raw : false));
  store.useDerivedState('triggerCount', () =>
    store.select('open') ? triggerElements.trackedSize() : 0,
  );
  // Reads the claimed values from the raw state: what was written, not what is derived. Like
  // upstream's write, the claim sticks once made: until the popup is closed and unmounted, until an
  // active trigger is written, or until the lost-trigger path below releases it. So a claimed
  // trigger that unmounts is still the active one, and its loss closes the popup.
  let claim: [string, Element] | undefined;
  const loneTriggerClaim = (rawState: State) => {
    const state = store.state;
    if (
      (!store.select('open') && !state.mounted) ||
      rawState.activeTriggerId != null ||
      rawState.activeTriggerElement != null
    ) {
      claim = undefined;
      return undefined;
    }
    if (claim === undefined && !state.openedWithoutTrigger) {
      claim = triggerElements.trackedLoneEntry();
    }
    return claim;
  };
  store.useDerivedState(
    'activeTriggerId',
    (rawId, rawState) => rawId ?? loneTriggerClaim(rawState)?.[0] ?? null,
  );
  store.useDerivedState(
    'activeTriggerElement',
    (rawElement, rawState) => rawElement ?? loneTriggerClaim(rawState)?.[1] ?? null,
  );

  useIsoLayoutEffect(
    ([openValue]) => {
      if (!openValue) {
        resolvedActiveTriggerIdRef.current = null;
        return;
      }

      const stateUpdates = {} as Pick<State, 'activeTriggerId' | 'activeTriggerElement'>;

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
                claim = undefined;
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
 * @param store The Store instance managing the popup state. It resets its open session through
 *   `resetOnUnmount` once the popup unmounts.
 * @param openProp The Root's `open` prop. Pass the prop itself, not the store's `openProp`.
 * @param animateInitialOpen Whether a popup that mounts already open should still play its enter
 *   transition. Defaults to `false`, so content that was open on the first render (a `defaultOpen`
 *   popup on page load, SSR'd markup) appears without animating. Opt in for popups whose subtree
 *   only mounts in response to something the user did, such as a submenu inside a menu popup.
 * @param popupRef The element whose closing animations are awaited before unmounting.
 *
 * @returns The transition status, and a function to forcibly unmount the popup. That function is a
 *   no-op once the popup is already unmounted, so calling it after the automatic unmount doesn't
 *   repeat the completion callback.
 */
function useOpenStateTransitions<State extends PopupStoreState<unknown>>(
  open: Accessor<boolean>,
  store: PopupRootStore,
  openProp: Accessor<boolean | undefined>,
  animateInitialOpen?: boolean,
  popupRef: RefObject<HTMLElement | null> = store.context.popupRef,
) {
  // In controlled mode, `state.open` holds the last open-change request instead of the open state,
  // and a close through the prop doesn't reset it. Clear it when the prop closes the popup, so
  // `true` on unmount means a request made since then.
  // Port note: upstream resets it from a layout effect. Here it's derived: `false` from the prop's
  // close until the next write.
  store.useResetState('open', () =>
    openProp() === false ? { value: false as State['open'] } : undefined,
  );

  const { mounted, transitionStatus, forceUnmount } = useUnmountAfterClose({
    open,
    ref: popupRef,
    // The popup part writes its element to the store as it attaches.
    subscribeToAttach: store.subscribe,
    preventUnmountOnClose: store.useState('preventUnmountingOnClose'),
    setPreventUnmountOnClose: (preventUnmountOnClose) =>
      store.set('preventUnmountingOnClose', preventUnmountOnClose),
    animateInitialOpen,
    onUnmount() {
      store.resetOnUnmount();
      store.context.onOpenChangeComplete?.(false);
    },
  });

  // Seed the Root-owned store before parts subscribe, matching the hook's initial mounted state.
  // Otherwise, an initially open Root looks like a reopen until the layout effect syncs the store.
  store.set('mounted', untrack(mounted));

  store.useSyncedValues(() => ({ mounted: mounted(), transitionStatus: transitionStatus() }));

  return { forceUnmount, transitionStatus };
}

export function usePopupRootSync<
  State extends PopupStoreState<unknown> & {
    openMethod: InteractionType | null;
  },
>(
  store: SolidStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>,
  open: Accessor<boolean>,
) {
  // Port note: upstream resets `openMethod` from a layout effect when the popup closes. Here it's
  // derived: it's the method written since the popup last closed (an interaction can record it
  // before the popup opens), or none.
  store.useResetState('openMethod', () =>
    open() ? undefined : { value: null as State['openMethod'] },
  );
}
