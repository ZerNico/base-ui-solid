import { untrack } from 'solid-js';
import { SolidStore } from '@base-ui-solid/utils/store';
import { isElement } from '@floating-ui/utils/dom';
import type { BaseUIChangeEventDetails } from '../../types';
import type { PopupStoreContext, PopupStoreSelectors, PopupStoreState } from '../../utils/popups';
import type { FloatingRootStore } from '../components/FloatingRootStore';

/**
 * Narrowed to the store members this hook uses so consumers do not need to provide
 * unrelated store capabilities.
 */
export type SyncedFloatingRootContextStore<State extends PopupStoreState<unknown>> = Pick<
  SolidStore<Readonly<State>, PopupStoreContext<never>, PopupStoreSelectors>,
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

  // Port note: derived into the floating root store instead of copied by an effect on every open.
  store.useSyncedValues(() => {
    const reference = referenceElement();
    return {
      open: open(),
      floatingId: options.floatingId,
      referenceElement: reference,
      // Only a DOM element replaces the DOM reference.
      domReferenceElement: isElement(reference) ? (reference as Element) : SolidStore.KEEP,
      floatingElement: floatingElement(),
    };
  });
  // The position reference follows the reference element until something else is written to it
  // (e.g. a virtual element from `useClientPoint`), like upstream's sync that only moved it while
  // it was still the reference element.
  const followedPositionReference = untrack(() => store.state.positionReference);
  store.useDerivedState('positionReference', (raw) =>
    raw === followedPositionReference ? store.state.referenceElement : raw,
  );

  // Keep non-reactive context values fresh for interactions that call `store.setOpen`.
  store.context.onOpenChange = handleOpenChange;
  store.context.nested = nested;

  return store;
}
