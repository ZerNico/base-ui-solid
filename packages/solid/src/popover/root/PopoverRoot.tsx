import { Show, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useDismiss } from '../../utils/popups/interactions/useDismiss';
import { FloatingTree } from '../../utils/popups/tree/FloatingTree';
import { PopoverRootContext, usePopoverRootContext } from './PopoverRootContext';
import { PopoverStore } from '../store/PopoverStore';
import type { PopoverHandle } from '../store/PopoverHandle';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { REASONS } from '../../internals/reasons';
import {
  renderPopupRootChildren,
  usePopupHandleAttachment,
  usePopupRoot,
  usePopupRootSync,
} from '../../utils/popups/popupRoot';
import { usePopupInteractionProps } from '../../utils/popups/popupStoreUtils';
import type { PayloadChildRenderFunction } from '../../utils/popups/popupRoot';

function PopoverRootComponent<Payload>(componentProps: {
  props: PopoverRoot.Props<Payload>;
  store: PopoverStore<Payload>;
  open: Accessor<boolean>;
  mounted: Accessor<boolean>;
  payload: Accessor<Payload | undefined>;
}) {
  const { props, store, open, mounted, payload } = untrack(() => ({ ...componentProps }));

  usePopupRootSync(store, open);

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

  // Detached triggers share this one Root, so mounting its interactions eagerly is cheap. The
  // trigger props they publish then stay stable, so opening and closing doesn't re-render inactive
  // triggers.
  const shouldRenderInteractions = () => open() || mounted() || props.handle != null;

  return (
    <PopoverRootContext value={store as PopoverRootContext<unknown>}>
      {renderPopupRootChildren({
        interactions: (
          <Show when={shouldRenderInteractions()}>
            <PopoverInteractions store={store} modal={modal()} />
          </Show>
        ),
        children: props.children,
        payload,
      })}
    </PopoverRootContext>
  );
}

/**
 * Groups all parts of the popover.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverRoot<Payload = unknown>(props: PopoverRoot.Props<Payload>) {
  // Port note: upstream runs this in the Root component inside the floating tree. Here it runs in
  // the outer Root body, so that the handle attachment below comes before the effects of later
  // siblings (see `usePopupHandleAttachment`).
  const { store, open, mounted, payload } = usePopupRoot(
    props,
    (initialState, defaultPopupId) =>
      new PopoverStore<Payload>(
        { ...initialState, modal: untrack(() => props.modal ?? false) },
        defaultPopupId,
      ),
  );

  // Dispose the patient-click timeout held in the store's context on unmount.
  useEffect(
    () => store.context.stickIfOpenTimeout.disposeEffect(),
    () => [store],
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
    // Port note: JSX type arguments are emitted as runtime values by the Solid compiler.
    // eslint-disable-next-line solid/components-return-once -- context presence never changes (mirrors upstream's early return)
    return (
      <PopoverRootComponent
        props={props}
        store={store}
        open={open}
        mounted={mounted}
        payload={payload}
      />
    );
  }

  return (
    <FloatingTree>
      <PopoverRootComponent
        props={props}
        store={store}
        open={open}
        mounted={mounted}
        payload={payload}
      />
    </FloatingTree>
  );
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
   * A callback that receives the imperative actions. It's called once, when the component is
   * set up (like a `ref` callback).
   * - `unmount`: Ends the closing phase of the popover after an externally controlled closing animation finishes.
   * Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the popover completes closing on its own.
   * Whether it leaves the DOM is decided by `keepMounted` on the portal.
   * - `close`: Closes the popover imperatively when called.
   */
  actionsRef?: ((actions: PopoverRoot.Actions) => void) | undefined;
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
  const dismiss = useDismiss(store, {
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
