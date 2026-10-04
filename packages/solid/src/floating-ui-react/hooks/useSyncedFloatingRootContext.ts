import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { ReactStore } from '@base-ui-solid/utils/store';
import { isElement } from '@floating-ui/utils/dom';
import type { BaseUIChangeEventDetails } from '../../types';
import type { PopupStoreContext, PopupStoreSelectors, PopupStoreState } from '../../utils/popups';
import type { FloatingRootState, FloatingRootStore } from '../components/FloatingRootStore';

/**
 * Narrowed to the store members this hook uses so consumers do not need to provide
 * unrelated store capabilities.
 */
export type SyncedFloatingRootContextStore<State extends PopupStoreState<unknown>> = Pick<
  ReactStore<Readonly<State>, PopupStoreContext<never>, PopupStoreSelectors>,
  'context' | 'state' | 'useState' | 'useSyncedValue'
>;

/**
 * Port note: the options are read once (they're stable for a popup root), except `floatingId`,
 * which is read lazily (pass a getter when it can change, like Menu's rendered popup id).
 */
export interface UseSyncedFloatingRootContextOptions<
  State extends PopupStoreState<unknown>,
  OpenChangeEventDetails extends BaseUIChangeEventDetails<string>,
> {
  popupStore: SyncedFloatingRootContextStore<State>;
  /**
   * Whether the Popup element is passed to Floating UI as the floating element instead of the default Positioner.
   */
  treatPopupAsFloatingElement?: boolean | undefined;
  floatingRootContext: FloatingRootStore;
  floatingId: string | undefined;
  nested: boolean;
  onOpenChange(open: boolean, eventDetails: OpenChangeEventDetails): void;
}

/**
 * Keeps the provided FloatingRootStore in sync with the provided PopupStore.
 */
export function useSyncedFloatingRootContext<
  State extends PopupStoreState<unknown>,
  OpenChangeEventDetails extends BaseUIChangeEventDetails<string>,
>(options: UseSyncedFloatingRootContextOptions<State, OpenChangeEventDetails>): FloatingRootStore {
  const {
    popupStore,
    treatPopupAsFloatingElement = false,
    floatingRootContext: store,
    nested,
    onOpenChange,
  } = options;

  const open = popupStore.useState('open');
  const referenceElement = popupStore.useState('activeTriggerElement');
  const floatingElement = popupStore.useState(
    treatPopupAsFloatingElement ? 'popupElement' : 'positionerElement',
  );

  const handleOpenChange = onOpenChange as (
    open: boolean,
    eventDetails: BaseUIChangeEventDetails<string>,
  ) => void;

  popupStore.useSyncedValue('floatingId', () => options.floatingId as State['floatingId']);

  useIsoLayoutEffect(
    ([openValue, floatingIdValue, referenceElementValue, floatingElementValue]) => {
      const valuesToSync = {
        open: openValue,
        floatingId: floatingIdValue,
        referenceElement: referenceElementValue,
        floatingElement: floatingElementValue,
      } as Pick<
        FloatingRootState,
        | 'open'
        | 'floatingId'
        | 'referenceElement'
        | 'floatingElement'
        | 'domReferenceElement'
        | 'positionReference'
      >;

      if (isElement(referenceElementValue)) {
        valuesToSync.domReferenceElement = referenceElementValue;
      }

      if (store.state.positionReference === store.state.referenceElement) {
        valuesToSync.positionReference = referenceElementValue;
      }

      store.update(valuesToSync);
    },
    () => [open(), options.floatingId, referenceElement(), floatingElement(), store] as const,
  );

  // Keep non-reactive context values fresh for interactions that call `store.setOpen`.
  store.context.onOpenChange = handleOpenChange;
  store.context.nested = nested;

  return store;
}
