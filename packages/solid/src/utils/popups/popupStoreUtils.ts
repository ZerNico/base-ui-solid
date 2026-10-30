import { createMemo, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { SolidStore } from '@base-ui-solid/utils/store';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { FOCUSABLE_ATTRIBUTE } from './constants';
import type { HTMLProps } from '../../internals/types';
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

// Writes the count for stores without a Root (`useImplicitActiveTrigger` derives it, and the
// derived value wins). Only runs when a trigger (un)registers while the popup is open.
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
    IS_DEV ? 'BaseUI.useTriggerDataForwarding.migrateTrigger' : undefined,
  );

  // While this trigger owns the mounted popup, its trigger-owned values (payload, close delay,
  // the floating tree ids, ...) are derived into the store instead of written from an effect on
  // every open. The memo owns the registrations, so they move to a new store with the trigger.
  void createMemo(() => {
    const store = read(storeParam);
    for (const key of Object.keys(untrack(stateUpdatesParam)) as Key[]) {
      store.useConditionalSyncedValue(
        key,
        isMountedByThisTrigger,
        () => stateUpdatesParam()[key] as State[Key],
      );
    }
  });

  // Only corrects a stale active trigger element (e.g. a trigger that re-rendered its element).
  useIsoLayoutEffect(
    ([isMounted, store]) => {
      if (isMounted && store.state.activeTriggerElement !== triggerElementRef.current) {
        store.update({ activeTriggerElement: triggerElementRef.current } as Pick<
          Readonly<State>,
          'activeTriggerElement'
        >);
      }
    },
    () => [isMountedByThisTrigger(), read(storeParam), triggerElementRef] as const,
    IS_DEV ? 'BaseUI.useTriggerDataForwarding.activeTriggerElement' : undefined,
  );

  return { registerTrigger, isMountedByThisTrigger };
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
