import { Show } from 'solid-js';
import { DialogInteractions } from './useDialogRoot';
import { DialogRootContext, useDialogRootContext } from './DialogRootContext';
import { DialogStore } from '../store/DialogStore';
import type { DialogRootProps } from './DialogRoot';
import {
  renderPopupRootChildren,
  usePopupHandleAttachment,
  usePopupRoot,
  usePopupRootSync,
} from '../../utils/popups/popupRoot';

export function useRenderDialogRoot<Payload>(
  mode: DialogRootMode,
  props: DialogRootProps<Payload>,
) {
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

  const { store, open, mounted, payload } = usePopupRoot(
    props,
    (initialState, floatingId) =>
      new DialogStore<Payload>({ ...initialState, ...rootState() }, floatingId),
  );

  store.useSyncedValues(rootState);

  usePopupRootSync(store, open);

  // Port note: upstream renders `<PopupHandleAttachment>` first so its layout effect runs before
  // descendant layout effects. Solid creates the Root's JSX children after the Root's later
  // siblings, so their effects would run first; the attachment effect is created here in the Root
  // body instead, before any descendant's or later sibling's effect (e.g. a layout effect that opens
  // the dialog through the handle in the same commit).
  usePopupHandleAttachment(() => props.handle, store);

  // Detached triggers share this one Root, so mounting its interactions eagerly is cheap. The
  // trigger props they publish then stay stable, so opening and closing doesn't re-render inactive
  // triggers.
  const shouldRenderInteractions = () => open() || mounted() || props.handle != null;

  return (
    <DialogRootContext value={store as DialogStore<unknown>}>
      {renderPopupRootChildren({
        interactions: (
          <Show when={shouldRenderInteractions()}>
            <DialogInteractions
              store={store}
              parentContext={parentStore?.context}
              isDrawer={isDrawer}
            />
          </Show>
        ),
        children: props.children,
        payload,
      })}
    </DialogRootContext>
  );
}

type DialogRootMode = 'dialog' | 'drawer' | 'alert-dialog';
