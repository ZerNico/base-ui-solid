import { vi } from 'vitest';
import { SolidStore } from '@base-ui-solid/utils/store';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import {
  createInitialPopupStoreState,
  createPopupStoreContext,
  popupStoreSelectors,
} from '../src/utils/popups/store';
import type {
  PopupStoreContext,
  PopupStoreSelectors,
  PopupStoreState,
} from '../src/utils/popups/store';
import {
  useTriggerDataForwarding,
  useTriggerRegistration,
} from '../src/utils/popups/popupStoreUtils';
import type { BaseUIChangeEventDetails } from '../src/types';

// Port note: the components take their changing props through getters (`props.id`), and the hooks
// receive them as accessors.

export type TestPopupStore = SolidStore<
  PopupStoreState<unknown>,
  PopupStoreContext<unknown>,
  PopupStoreSelectors
> & {
  setOpen: (open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void;
};

/**
 * Creates a bare popup store whose `setOpen` only writes `open`.
 */
export function createTestPopupStore() {
  const store = new SolidStore<
    PopupStoreState<unknown>,
    PopupStoreContext<unknown>,
    PopupStoreSelectors
  >(
    createInitialPopupStoreState(),
    createPopupStoreContext(),
    popupStoreSelectors,
  ) as TestPopupStore;

  store.setOpen = vi.fn((open) => {
    store.set('open', open);
  });

  return store;
}

/**
 * Registers `element` as a trigger of `store`.
 */
export function TestTrigger(props: {
  id: string;
  store: SolidStore<PopupStoreState<unknown>, PopupStoreContext<unknown>, PopupStoreSelectors>;
  element: HTMLElement;
  repeat?: number;
}) {
  const register = useTriggerRegistration(
    () => props.id,
    () => props.store,
  );

  // `register` is stable, so the caller owns migration by keying this effect on `[store, id]`.
  useIsoLayoutEffect(
    ([repeat, element]) => {
      for (let i = 0; i < repeat; i += 1) {
        register(element);
      }
      return () => {
        register(null);
      };
    },
    () => [props.repeat ?? 1, props.element, props.store, props.id] as const,
  );

  return null;
}

/**
 * Registers `element` as a trigger of `store` and forwards `payload` while it is active.
 */
export function TestForwardedTrigger(props: {
  id: string;
  store: SolidStore<PopupStoreState<unknown>, PopupStoreContext<unknown>, PopupStoreSelectors>;
  element: HTMLElement;
  payload?: unknown;
}) {
  const elementRef: RefObject<Element | null> = { current: null };
  const { registerTrigger } = useTriggerDataForwarding(
    () => props.id,
    elementRef,
    () => props.store,
    () => ({ payload: props.payload }),
  );

  useIsoLayoutEffect(
    ([element]) => {
      elementRef.current = element;
      registerTrigger(element);
      return () => {
        registerTrigger(null);
        elementRef.current = null;
      };
    },
    () => [props.element] as const,
  );

  return null;
}
