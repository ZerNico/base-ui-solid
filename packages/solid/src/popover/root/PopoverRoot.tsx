import { Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useDismiss, FloatingTree } from '../../floating-ui-react';
import { PopoverRootContext, usePopoverRootContext } from './PopoverRootContext';
import { PopoverStore } from '../store/PopoverStore';
import type { State as PopoverStoreState } from '../store/PopoverStore';
import type { PopoverHandle } from '../store/PopoverHandle';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import {
  useImplicitActiveTrigger,
  usePopupRootStore,
  useOpenStateTransitions,
  usePopupInteractionProps,
  usePopupRootSync,
  usePopupHandleAttachment,
} from '../../utils/popups';
import type { PayloadChildRenderFunction } from '../../utils/popups';

function PopoverRootComponent<Payload>(componentProps: {
  props: PopoverRoot.Props<Payload>;
  store: PopoverStore<Payload>;
}) {
  const props = untrack(() => componentProps.props);

  const store = untrack(() => componentProps.store);

  store.useControlledProp('openProp', () => props.open);
  store.useControlledProp('triggerIdProp', () => props.triggerId);

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload');

  store.useContextCallback('onOpenChange', () => props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', () => props.onOpenChangeComplete);

  usePopupRootSync(store, open);
  useImplicitActiveTrigger(store);
  const { forceUnmount } = useOpenStateTransitions(open, store, () => {
    store.update({ stickIfOpen: true, openChangeReason: null });
  });

  const modal = () => props.modal ?? false;

  store.useSyncedValues(() => ({
    modal: modal(),
  }));

  useEffect(
    ([openValue]) => {
      if (!openValue) {
        store.context.stickIfOpenTimeout.clear();
      }
    },
    () => [open()],
  );

  // Port note: `React.useImperativeHandle(props.actionsRef, …)`. React assigns the handle before
  // ancestors' effects run; Solid runs ancestors' effects first, so it's also assigned on setup.
  const actions: PopoverRoot.Actions = {
    unmount: forceUnmount,
    close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
  };
  const initialActionsRef = untrack(() => props.actionsRef);
  if (initialActionsRef) {
    initialActionsRef.current = actions;
  }
  useIsoLayoutEffect(
    ([actionsRef]) => {
      if (!actionsRef) {
        return undefined;
      }
      actionsRef.current = actions;
      return () => {
        actionsRef.current = null;
      };
    },
    () => [props.actionsRef],
  );

  const shouldRenderInteractions = () => open() || mounted();

  // Port note: a children render function is called once, with an object whose `payload` is a
  // getter: read it in a reactive scope (don't destructure it).
  const payloadArg = {
    get payload() {
      return payload() as Payload | undefined;
    },
  };

  return (
    <PopoverRootContext value={store as PopoverRootContext<unknown>}>
      <Show when={shouldRenderInteractions()}>
        <PopoverInteractions store={store} modal={modal()} />
      </Show>
      {(() => {
        const children = props.children;
        // Port note: a single component child can also be a function (e.g. the accessor a
        // `<Show>` returns), so a function counts as a render function only when it declares a
        // parameter, like Solid's `<Show>` does for its function children.
        return typeof children === 'function' && children.length > 0
          ? untrack(() => (children as PayloadChildRenderFunction<Payload>)(payloadArg))
          : children;
      })()}
    </PopoverRootContext>
  );
}

/**
 * Groups all parts of the popover.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverRoot<Payload = unknown>(props: PopoverRoot.Props<Payload>) {
  const store = usePopoverRootStore<Payload>(
    untrack(() => ({
      modal: props.modal ?? false,
      open: props.defaultOpen ?? false,
      openProp: props.open,
      activeTriggerId: props.defaultTriggerId ?? null,
      triggerIdProp: props.triggerId,
    })),
  );

  // Port note: detached triggers migrate through effects, which Solid may run in reverse
  // order. Preserve the first registered trigger when attaching an initially open root,
  // matching React's child-first registration order once all siblings have rendered.
  useIsoLayoutEffect(
    () => {
      const firstTrigger = props.handle?.store.context.triggerElements.entries().next().value;
      if (store.select('open') && store.select('activeTriggerId') == null && firstTrigger) {
        store.update({ activeTriggerId: firstTrigger[0], activeTriggerElement: firstTrigger[1] });
      }
    },
    () => [store],
  );

  // Port note: attach in the Root body so the effect precedes descendants and later siblings,
  // matching upstream's first-child layout effect despite Solid's parent-first effect order.
  usePopupHandleAttachment(() => props.handle, store);

  if (usePopoverRootContext(true)) {
    // eslint-disable-next-line solid/components-return-once -- context presence never changes (mirrors upstream's early return)
    return <PopoverRootComponent<Payload> props={props} store={store} />;
  }

  return (
    <FloatingTree>
      <PopoverRootComponent<Payload> props={props} store={store} />
    </FloatingTree>
  );
}

function usePopoverRootStore<Payload>(initialState: Partial<PopoverStoreState<Payload>>) {
  // The store is owned by this Root instance and created exactly once. It is not tied to the handle:
  // the handle attaches to it, so swapping the handle re-attaches rather than recreating state.
  // Default values are only initial values; controlled values and root state are synced after creation.
  const store = usePopupRootStore(
    (floatingId, nested) => new PopoverStore<Payload>(initialState, floatingId, nested),
  );

  // Popover-specific: dispose the patient-click timeout held in the store's context on unmount.
  useEffect(
    () => store.context.stickIfOpenTimeout.disposeEffect(),
    () => [store],
  );

  return store;
}

export interface PopoverRootState {}

export interface PopoverRootProps<Payload = unknown> {
  /**
   * Whether the popover is initially open.
   *
   * To render a controlled popover, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the popover is currently open.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the popover is opened or closed.
   */
  onOpenChange?:
    ((open: boolean, eventDetails: PopoverRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the popover is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: Ends the closing phase of the popover after an externally controlled closing animation finishes.
   * Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the popover completes closing on its own.
   * Whether it leaves the DOM is decided by `keepMounted` on the portal.
   * - `close`: Closes the popover imperatively when called.
   */
  actionsRef?: RefObject<PopoverRoot.Actions | null> | undefined;
  /**
   * Determines if the popover enters a modal state when open.
   * - `true`: user interaction is limited to the popover: document page scroll is locked, and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   * - `'trap-focus'`: focus is trapped inside the popover, but document page scroll is not locked and pointer interactions outside of it remain enabled.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   *
   * When `modal` is `true`, focus trapping is enabled only if `<Popover.Close>` is rendered
   * inside `<Popover.Popup>`. It can be visually hidden with your own CSS if needed, such as
   * Tailwind's `sr-only` utility.
   *
   * When `modal` is `'trap-focus'`, render `<Popover.Close>` inside `<Popover.Popup>` so touch
   * screen readers can escape the popup.
   * @default false
   */
  modal?: boolean | 'trap-focus' | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjunction with the `open` prop to create a controlled popover.
   * There's no need to specify this prop when the popover is uncontrolled (that is, when the `open` prop is not set).
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open popover.
   */
  defaultTriggerId?: string | null | undefined;
  /**
   * A handle to associate the popover with a trigger.
   * If specified, allows external triggers to control the popover's open state.
   */
  handle?: PopoverHandle<Payload> | undefined;
  /**
   * The content of the popover.
   * This can be a regular JSX element or a render function that receives the `payload` of the active trigger.
   */
  children?: JSX.Element | PayloadChildRenderFunction<Payload> | undefined;
}

export interface PopoverRootActions {
  unmount: () => void;
  close: () => void;
}

export type PopoverRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.closePress
  | typeof REASONS.focusOut
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;
export type PopoverRootChangeEventDetails =
  BaseUIChangeEventDetails<PopoverRoot.ChangeEventReason> & {
    /** Prevents the popup from unmounting until the `unmount` action is called. */
    preventUnmountOnClose: () => void;
  };

export namespace PopoverRoot {
  export type State = PopoverRootState;
  export type Props<Payload = unknown> = PopoverRootProps<Payload>;
  export type Actions = PopoverRootActions;
  export type ChangeEventReason = PopoverRootChangeEventReason;
  export type ChangeEventDetails = PopoverRootChangeEventDetails;
}

function PopoverInteractions(props: { store: PopoverStore<any>; modal: boolean | 'trap-focus' }) {
  const store = untrack(() => props.store);
  // Port note: the floating root context is created with the store and never replaced, so it's
  // read once.
  const floatingRootContext = store.select('floatingRootContext');

  const dismiss = useDismiss(floatingRootContext, {
    outsidePressEvent: {
      // Ensure `aria-hidden` on outside elements is removed immediately
      // on outside press when trapping focus.
      get mouse() {
        return props.modal === 'trap-focus' ? ('sloppy' as const) : ('intentional' as const);
      },
      touch: 'sloppy',
    },
  });

  // `useDismiss` is not given an `enabled` option, so it always returns both prop bags. Restore
  // the `EMPTY_OBJECT` fallbacks if that ever changes: the store fields are non-optional.
  // `dismiss.trigger` is always the same object as `dismiss.reference`.
  const triggerProps = dismiss.reference!;
  // PopoverPopup already spreads `FOCUSABLE_POPUP_PROPS` directly, so the popup
  // props only need to carry the dismiss handlers.
  const popupProps = dismiss.floating!;

  usePopupInteractionProps(store, () => ({
    activeTriggerProps: triggerProps,
    inactiveTriggerProps: triggerProps,
    popupProps,
  }));

  return null;
}
