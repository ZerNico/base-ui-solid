import { untrack } from 'solid-js';
import { useId } from '@base-ui-solid/utils/useId';
import { SolidStore } from '@base-ui-solid/utils/store';
import { PopupTriggerMap } from '../popupTriggerMap';
import type { BaseUIChangeEventDetails } from '../../../internals/createBaseUIEventDetails';
import { useFloatingParentNodeId } from '../tree/FloatingTree';
import { FloatingRootStore } from './FloatingRootStore';

/**
 * What `useFloatingRootStore` syncs into its store.
 *
 * Port note: read lazily like Solid props (`options.open`), so pass a props-like object with
 * getters for reactive options.
 */
export interface UseFloatingRootStoreOptions {
  /**
   * Whether the popup is open. Positioning clears the anchor while the popup isn't mounted, and
   * syncs it in again only when `open` or `elements.anchor` changes, so `open` must follow
   * `mounted`.
   * @default false
   */
  open?: boolean | undefined;
  /**
   * Called when an interaction hook requests an open change.
   */
  onOpenChange?(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  /**
   * The elements to sync into the store. A key left `undefined` keeps the store's current value.
   */
  elements?:
    | {
        /**
         * The DOM element the popup is anchored to. To position against a virtual element, pass it
         * as `useAnchorPositioning`'s `anchor` instead.
         */
        anchor?: Element | null | undefined;
        /**
         * The popup's positioner element, or the popup itself when it has no positioner.
         */
        positionerElement?: HTMLElement | null | undefined;
      }
    | undefined;
}

/**
 * Creates a `FloatingRootStore` for components that manage their open state without a popup
 * store. The open state, anchor and positioner element are synced into it from a layout effect
 * whenever they change; `onOpenChange` and the nesting flag are updated during render.
 */
export function useFloatingRootStore(options: UseFloatingRootStoreOptions): FloatingRootStore {
  const open = () => options.open ?? false;
  const elements = () => options.elements ?? {};

  const defaultPopupId = useId();
  const nested = useFloatingParentNodeId() != null;

  const store = untrack(
    () =>
      new FloatingRootStore({
        open: open(),
        // Port note: reads the latest `onOpenChange` (see the context getter below).
        onOpenChange: undefined,
        anchorElement: elements().anchor ?? null,
        positionerElement: elements().positionerElement ?? null,
        triggerElements: new PopupTriggerMap(),
        defaultPopupId,
        nested,
      }),
  );

  // Port note: upstream writes these from a layout effect. Here they're derived (see
  // `SolidStore.useSyncedValues`): an element option that is `undefined` leaves the element as it
  // is, and an imperative write (e.g. a ref setter) holds until one of these values changes.
  store.useSyncedValues(() => {
    const { anchor, positionerElement } = elements();
    return {
      open: open(),
      defaultPopupId,
      anchorElement: anchor === undefined ? SolidStore.KEEP : anchor,
      positionerElement: positionerElement === undefined ? SolidStore.KEEP : positionerElement,
    };
  });

  // Port note: upstream assigns the latest `onOpenChange` on every render.
  Object.defineProperty(store.context, 'onOpenChange', {
    get() {
      return options.onOpenChange;
    },
    set(value) {
      Object.defineProperty(store.context, 'onOpenChange', {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    },
    configurable: true,
    enumerable: true,
  });
  store.context.nested = nested;

  return store;
}
