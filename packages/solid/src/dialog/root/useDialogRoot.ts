import { createSignal, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useScrollLock } from '@base-ui-solid/utils/useScrollLock';
import { useDismiss } from '../../floating-ui-solid';
import { contains, getTarget } from '../../floating-ui-solid/utils';
import type { DialogStore } from '../store/DialogStore';
import { usePopupInteractionProps } from '../../utils/popups';

/**
 * Port note: `store`, `parentContext` and `isDrawer` are read once (they don't change for the
 * lifetime of a Root).
 */
export function DialogInteractions(props: {
  store: DialogStore<any>;
  parentContext: DialogStore<unknown>['context'] | undefined;
  isDrawer: boolean;
}) {
  const { store, parentContext, isDrawer } = untrack(() => ({
    store: props.store,
    parentContext: props.parentContext,
    isDrawer: props.isDrawer,
  }));

  const open = store.useState('open');
  const disablePointerDismissal = store.useState('disablePointerDismissal');
  const modal = store.useState('modal');
  const popupElement = store.useState('popupElement');
  // Port note: the floating root context is created with the store and never replaced, so it's
  // read once.
  const floatingRootContext = store.select('floatingRootContext');

  const [ownNestedOpenDialogs, setOwnNestedOpenDialogs] = createSignal(0, { ownedWrite: true });
  const [ownNestedOpenDrawers, setOwnNestedOpenDrawers] = createSignal(0, { ownedWrite: true });
  const isTopmost = () => ownNestedOpenDialogs() === 0;

  const dismiss = useDismiss(floatingRootContext, {
    outsidePressEvent() {
      if (store.context.internalBackdropRef.current || store.context.backdropRef.current) {
        return 'intentional';
      }
      // Ensure `aria-hidden` on outside elements is removed immediately
      // on outside press when trapping focus.
      return {
        mouse: modal() === 'trap-focus' ? 'sloppy' : 'intentional',
        touch: 'sloppy',
      };
    },
    outsidePress(event) {
      if (!store.context.outsidePressEnabledRef.current) {
        return false;
      }

      // For mouse events, only accept left button (button 0)
      // For touch events, a single touch is equivalent to left button
      if ('button' in event && event.button !== 0) {
        return false;
      }
      if ('touches' in event) {
        // Outside press can be handled on `touchend`, where the lifted point is
        // reported in `changedTouches` and `touches` contains any remaining
        // active points. Treat it as a single-finger tap only when exactly one
        // touch ended and no other fingers are still down.
        if (event.type === 'touchend') {
          if (event.changedTouches.length !== 1 || event.touches.length !== 0) {
            return false;
          }
        } else if (event.touches.length !== 1) {
          return false;
        }
      }

      const target = getTarget(event) as Element | null;
      if (isTopmost() && !disablePointerDismissal()) {
        // Only close if the click occurred on the dialog's owning backdrop.
        // This supports multiple modal dialogs that aren't nested in the React tree:
        // https://github.com/mui/base-ui/issues/1320
        if (modal()) {
          const internalBackdrop = store.context.internalBackdropRef.current;
          const backdrop = store.context.backdropRef.current;
          return internalBackdrop || backdrop
            ? internalBackdrop === target ||
                backdrop === target ||
                (contains(target, popupElement()) && !target?.hasAttribute('data-base-ui-portal'))
            : true;
        }
        return true;
      }
      return false;
    },
    get escapeKey() {
      return isTopmost();
    },
  });

  useScrollLock(() => open() && modal() === true, popupElement);

  // Listen for nested open/close events on this store to maintain the counts.
  // A close notification is an open notification with zeroed counts.
  store.useContextCallback('onNestedDialogOpen', () => (dialogCount, drawerCount) => {
    setOwnNestedOpenDialogs(dialogCount);
    setOwnNestedOpenDrawers(drawerCount);
  });

  // Notify parent of our open/close state using parent callbacks, if any
  useIsoLayoutEffect(
    ([openValue, ownNestedOpenDialogsValue, ownNestedOpenDrawersValue]) => {
      if (parentContext?.onNestedDialogOpen) {
        if (openValue) {
          parentContext.onNestedDialogOpen(
            ownNestedOpenDialogsValue + 1,
            ownNestedOpenDrawersValue + (isDrawer ? 1 : 0),
          );
        } else {
          parentContext.onNestedDialogOpen(0, 0);
        }
      }
      return () => {
        if (parentContext?.onNestedDialogOpen && openValue) {
          parentContext.onNestedDialogOpen(0, 0);
        }
      };
    },
    () => [open(), ownNestedOpenDialogs(), ownNestedOpenDrawers()] as const,
  );

  usePopupInteractionProps(store, () => ({
    // `enabled` is not passed to `useDismiss`, so its props are always defined,
    // and `trigger` is the same object as `reference`.
    activeTriggerProps: dismiss.reference!,
    inactiveTriggerProps: dismiss.trigger!,
    // DialogPopup and DrawerPopup spread `FOCUSABLE_POPUP_PROPS` directly, so
    // this only needs to carry the dismiss handlers.
    popupProps: dismiss.floating!,
    nestedOpenDialogCount: ownNestedOpenDialogs(),
    nestedOpenDrawerCount: ownNestedOpenDrawers(),
  }));

  return null;
}
