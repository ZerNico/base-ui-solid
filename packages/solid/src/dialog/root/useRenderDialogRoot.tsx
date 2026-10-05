import { Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useImperativeHandle } from '../../internals/useImperativeHandle';
import { DialogInteractions } from './useDialogRoot';
import { DialogRootContext, useDialogRootContext } from './DialogRootContext';
import { DialogStore } from '../store/DialogStore';
import type { DialogRootActions, DialogRootProps } from './DialogRoot';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import {
  useImplicitActiveTrigger,
  useOpenStateTransitions,
  usePopupHandleAttachment,
  usePopupRootStore,
  usePopupRootSync,
} from '../../utils/popups';
import type { PayloadChildRenderFunction } from '../../utils/popups';

export function useRenderDialogRoot<Payload>(
  mode: DialogRootMode,
  props: DialogRootProps<Payload>,
) {
  const defaultOpen = untrack(() => props.defaultOpen ?? false);
  const defaultTriggerIdProp = untrack(() => props.defaultTriggerId ?? null);

  const isDrawer = mode === 'drawer';
  const isAlertDialog = mode === 'alert-dialog';
  const modal = () => (isAlertDialog ? true : (props.modal ?? true));
  const disablePointerDismissal = () => isAlertDialog || (props.disablePointerDismissal ?? false);
  const role: 'dialog' | 'alertdialog' = isAlertDialog ? 'alertdialog' : 'dialog';

  const parentStore = useDialogRootContext(true);
  const nested = parentStore != null;
  const rootState = () => ({
    modal: modal(),
    disablePointerDismissal: disablePointerDismissal(),
    nested,
    role,
  });

  // The store is owned by this Root instance and created exactly once. It is not tied to the handle:
  // the handle attaches to it, so swapping the handle re-attaches rather than recreating state.
  // Default values are only initial values; controlled values and root state are synced after creation.
  // Dialogs pass the popup element to Floating UI as the floating element (`treatPopupAsFloatingElement`).
  const store = usePopupRootStore(
    (floatingId, floatingNested) =>
      new DialogStore<Payload>(
        {
          open: defaultOpen,
          openProp: props.open,
          activeTriggerId: defaultTriggerIdProp,
          triggerIdProp: props.triggerId,
          ...rootState(),
        },
        floatingId,
        floatingNested,
      ),
    true,
  );

  store.useControlledProp('openProp', () => props.open);
  store.useControlledProp('triggerIdProp', () => props.triggerId);

  store.useSyncedValues(rootState);
  store.useContextCallback('onOpenChange', () => props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', () => props.onOpenChangeComplete);

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload') as () => Payload | undefined;

  usePopupRootSync(store, open);
  useImplicitActiveTrigger(store);
  const { forceUnmount } = useOpenStateTransitions(open, store);

  const actions: DialogRootActions = {
    unmount: forceUnmount,
    close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
  };
  useImperativeHandle(() => props.actionsRef, actions);

  // Port note: upstream renders `<PopupHandleAttachment>` first so its layout effect runs before
  // descendant layout effects. Solid creates the Root's JSX children after the Root's later
  // siblings, so their effects would run first; the attachment effect is created here in the Root
  // body instead, before any descendant's or later sibling's effect (e.g. a layout effect that opens
  // the dialog through the handle in the same commit).
  usePopupHandleAttachment(() => props.handle, store);

  const shouldRenderInteractions = () => open() || mounted();

  // Port note: a render-function child is called once (React calls it on every render), with
  // `{ payload }` where `payload` is an accessor (see `PayloadChildRenderFunction`), so the
  // argument can be destructured.
  // A single component child can also be a function (e.g. the accessor a `<Show>` returns), so a
  // function counts as a render function only when it declares a parameter, like Solid's `<Show>`
  // does for its function children.
  const renderChildren = (): JSX.Element => {
    const children = props.children;
    if (typeof children === 'function' && children.length > 0) {
      return untrack(() => (children as PayloadChildRenderFunction<Payload>)({ payload }));
    }
    return children as JSX.Element;
  };

  return (
    <DialogRootContext value={store as DialogStore<unknown>}>
      <Show when={shouldRenderInteractions()}>
        <DialogInteractions
          store={store}
          parentContext={parentStore?.context}
          isDrawer={isDrawer}
        />
      </Show>
      {renderChildren()}
    </DialogRootContext>
  );
}

type DialogRootMode = 'dialog' | 'drawer' | 'alert-dialog';
