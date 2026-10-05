import { createMemo, omit, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useButton } from '../../internals/use-button/useButton';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { CLICK_TRIGGER_IDENTIFIER } from '../../internals/constants';
import type { DialogHandle } from '../store/DialogHandle';
import type { DialogHandleStore } from '../store/DialogStore';
import { usePopupHandleStore, useTriggerDataForwarding } from '../../utils/popups';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useClick } from '../../floating-ui-solid';
import { useOpenMethodTriggerProps } from '../../utils/useOpenInteractionType';

/**
 * A button that opens the dialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui-solid.pages.dev/solid/components/dialog)
 */
export const DialogTrigger = function DialogTrigger(componentProps: DialogTrigger.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'disabled',
    'nativeButton',
    'id',
    'payload',
    'handle',
  );
  const disabled = () => componentProps.disabled ?? false;

  const dialogRootStore = useDialogRootContext(true);
  // Port note: `usePopupHandleStore` reads its handle once, so it's recreated (with its
  // subscription) when the `handle` prop changes, like upstream re-subscribing to the new handle.
  const handleStoreAccessor = createMemo(() => usePopupHandleStore(componentProps.handle));
  const handleStore = () => handleStoreAccessor()();
  const store: Accessor<DialogHandleStore<unknown> | undefined> = () =>
    handleStore() ?? dialogRootStore;
  if (!untrack(store)) {
    throw new Error(
      'Base UI: <Dialog.Trigger> must be used within <Dialog.Root> or provided with a handle.',
    );
  }
  const currentStore = store as Accessor<DialogHandleStore<unknown>>;

  // Port note: a detached trigger follows the store its handle exposes, so store subscriptions are
  // recreated when it changes (upstream re-renders with the new store).
  function useCurrentStoreState<T>(
    select: (dialogStore: DialogHandleStore<unknown>) => Accessor<T>,
  ): Accessor<T> {
    const selected = createMemo(() => select(currentStore()));
    return () => selected()();
  }

  const generatedTriggerId = useBaseUiId();
  const thisTriggerId = () => componentProps.id ?? generatedTriggerId;
  const floatingContext = useCurrentStoreState((s) => s.useState('floatingRootContext'));
  const isOpenedByThisTrigger = useCurrentStoreState((s) =>
    s.useState('isOpenedByTrigger', thisTriggerId),
  );
  const popupId = useCurrentStoreState((s) => s.useState('triggerPopupId', thisTriggerId));

  const triggerElementRef: RefObject<HTMLElement | null> = { current: null };

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef,
    currentStore,
    () => ({
      payload: componentProps.payload,
    }),
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: () => componentProps.nativeButton ?? true,
  });

  // Port note: `useClick` is bound to a floating root context, so it's recreated when the
  // context changes.
  const click = createMemo(() => useClick(floatingContext()));
  const interactionTypeProps = useOpenMethodTriggerProps(
    () => currentStore().select('open'),
    (interactionType) => {
      currentStore().set('openMethod', interactionType);
    },
  );

  const state = createMemo<DialogTriggerState>(
    () => ({
      disabled: disabled(),
      open: isOpenedByThisTrigger(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const rootTriggerProps = useCurrentStoreState((s) =>
    s.useState('triggerProps', isMountedByThisTrigger),
  );

  return useRenderElement('button', componentProps, {
    state,
    ref: [
      buttonRef,
      registerTrigger,
      (element: HTMLElement | null) => {
        triggerElementRef.current = element;
      },
    ],
    props: () => [
      click().reference,
      rootTriggerProps(),
      interactionTypeProps,
      {
        [CLICK_TRIGGER_IDENTIFIER as string]: '',
        id: thisTriggerId(),
        'aria-haspopup': 'dialog' as const,
        'aria-expanded': isOpenedByThisTrigger(),
        'aria-controls': popupId(),
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping: triggerOpenStateMapping,
  });
} as DialogTrigger;

export interface DialogTrigger {
  <Payload>(componentProps: DialogTriggerProps<Payload>): JSX.Element;
}

export interface DialogTriggerProps<Payload = unknown>
  extends NativeButtonProps, Omit<BaseUIComponentProps<'button', DialogTriggerState>, 'disabled'> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  // Port note: declared here so it's a `boolean` (Solid's `disabled` attribute type also allows
  // `""`); upstream inherits it from React's button props.
  disabled?: boolean | undefined;
  /**
   * A handle to associate the trigger with a dialog.
   * Can be created with the Dialog.createHandle() method.
   */
  handle?: DialogHandle<Payload> | undefined;
  /**
   * A payload to pass to the dialog when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * ID of the trigger. In addition to being forwarded to the rendered element,
   * it is also used to specify the active trigger for the dialog in controlled mode (with the DialogRoot `triggerId` prop).
   */
  id?: string | undefined;
}

export interface DialogTriggerState {
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
  /**
   * Whether the dialog is currently open and was opened by this trigger.
   */
  open: boolean;
}

export namespace DialogTrigger {
  export type Props<Payload = unknown> = DialogTriggerProps<Payload>;
  export type State = DialogTriggerState;
}
