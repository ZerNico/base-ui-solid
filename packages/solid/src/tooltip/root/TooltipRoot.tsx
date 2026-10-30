import { createMemo, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { TooltipRootContext } from './TooltipRootContext';
import { useClientPoint } from '../../utils/popups/interactions/useClientPoint';
import { useDismiss } from '../../utils/popups/interactions/useDismiss';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import {
  renderPopupRootChildren,
  usePopupHandleAttachment,
  usePopupRoot,
} from '../../utils/popups/popupRoot';
import { usePopupInteractionProps } from '../../utils/popups/popupStoreUtils';
import type { PayloadChildRenderFunction } from '../../utils/popups/popupRoot';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { TooltipStore } from '../store/TooltipStore';
import type { TooltipHandle } from '../store/TooltipHandle';
import { REASONS } from '../../internals/reasons';
import type { HTMLProps } from '../../internals/types';

/**
 * Groups all parts of the tooltip.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui-solid.pages.dev/solid/components/tooltip)
 */
export function TooltipRoot<Payload>(props: TooltipRoot.Props<Payload>): JSX.Element {
  const disabled = () => props.disabled ?? false;
  const disableHoverablePopup = () => props.disableHoverablePopup ?? false;
  const trackCursorAxis = () => props.trackCursorAxis ?? 'none';

  const { store, open, mounted, payload, transitionStatus } = usePopupRoot(
    props,
    (initialState, defaultPopupId) => new TooltipStore<Payload>(initialState, defaultPopupId),
    { closeOnActiveTriggerUnmount: true, disabled },
  );

  const openState = store.useState('open');
  const activeTriggerId = store.useState('activeTriggerId');

  store.useSyncedValues(() => ({
    trackCursorAxis: trackCursorAxis(),
    disableHoverablePopup: disableHoverablePopup(),
    disabled: disabled(),
  }));

  useIsoLayoutEffect(
    ([openStateValue, disabledValue]) => {
      if (openStateValue && disabledValue) {
        store.setOpen(false, createChangeEventDetails(REASONS.disabled));
      }
    },
    () => [openState(), disabled(), store],
  );

  // Animations should be instant in two cases:
  // 1) Opening during the provider's instant phase (adjacent tooltip opens instantly)
  // 2) Closing because another tooltip opened (reason === 'none')
  // Otherwise, allow the animation to play. In particular, do not disable animations
  // during the 'ending' phase unless it's due to a sibling opening.
  // Port note: upstream sets `'delay'` from a layout effect and restores the previous value
  // afterwards. Here it's derived over the written value, which therefore needs no restoring.
  store.useDerivedState('instantType', (raw) => {
    const state = store.state;
    const ending = transitionStatus() === 'ending';
    return (ending && state.openChangeReason === REASONS.none) || (!ending && state.isInstantPhase)
      ? 'delay'
      : raw;
  });

  // Port note: upstream clears the payload from a layout effect when the popup is open without an
  // active trigger. Here the store derives it: no payload then, and none until the next write.
  store.useResetState(
    'payload',
    () => (open() && activeTriggerId() == null ? { value: undefined } : undefined),
    { hold: true },
  );

  // Port note: detached triggers registered before this Root migrate in Solid's effect
  // order. Preserve their original registration order when assigning default-open ownership.
  useIsoLayoutEffect(
    () => {
      if (store.select('open') && store.select('activeTriggerId') == null) {
        const firstTrigger = props.handle?.store.context.triggerElements.entries().next();
        if (firstTrigger && !firstTrigger.done) {
          const [id, element] = firstTrigger.value;
          store.update({ activeTriggerId: id, activeTriggerElement: element });
        }
      }
    },
    () => [],
  );

  // Port note: create the attachment effect in the Root body so it precedes descendant
  // and later sibling effects, matching upstream's child-first layout effect ordering.
  usePopupHandleAttachment(() => props.handle, store);

  const shouldRenderInteractions = createMemo(
    () => open() || mounted() || (!disabled() && trackCursorAxis() !== 'none'),
  );

  return (
    <TooltipRootContext value={store as TooltipRootContext}>
      {renderPopupRootChildren({
        interactions: (
          <Show when={shouldRenderInteractions()}>
            <TooltipInteractions
              store={store}
              disabled={disabled()}
              trackCursorAxis={trackCursorAxis()}
            />
          </Show>
        ),
        children: props.children,
        payload,
      })}
    </TooltipRootContext>
  );
}

export interface TooltipRootState {}

export interface TooltipRootProps<Payload = unknown> {
  /**
   * Whether the tooltip is initially open.
   *
   * To render a controlled tooltip, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the tooltip is currently open.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the tooltip is opened or closed.
   */
  onOpenChange?:
    ((open: boolean, eventDetails: TooltipRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the tooltip is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the tooltip contents can be hovered without closing the tooltip.
   * @default false
   */
  disableHoverablePopup?: boolean | undefined;
  /**
   * Determines which axis the tooltip should track the cursor on.
   * @default 'none'
   */
  trackCursorAxis?: 'none' | 'x' | 'y' | 'both' | undefined;
  /**
   * A callback that receives the imperative actions. It's called once, when the component is
   * set up (like a `ref` callback).
   * - `unmount`: Ends the closing phase of the tooltip after an externally controlled closing animation finishes.
   * Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the tooltip completes closing on its own.
   * Whether it leaves the DOM is decided by `keepMounted` on the portal.
   * - `close`: Closes the tooltip imperatively when called.
   */
  actionsRef?: ((actions: TooltipRoot.Actions) => void) | undefined;
  /**
   * Whether the tooltip is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A handle to associate the tooltip with a trigger.
   * If specified, allows external triggers to control the tooltip's open state.
   * Can be created with the Tooltip.createHandle() method.
   */
  handle?: TooltipHandle<Payload> | undefined;
  /**
   * The content of the tooltip.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: JSX.Element | PayloadChildRenderFunction<Payload> | undefined;
  /**
   * ID of the trigger that the tooltip is associated with.
   * This is useful in conjunction with the `open` prop to create a controlled tooltip.
   * There's no need to specify this prop when the tooltip is uncontrolled (that is, when the `open` prop is not set).
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the tooltip is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open tooltip.
   */
  defaultTriggerId?: string | null | undefined;
}

export interface TooltipRootActions {
  unmount: () => void;
  close: () => void;
}

export type TooltipRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.disabled
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type TooltipRootChangeEventDetails =
  BaseUIChangeEventDetails<TooltipRoot.ChangeEventReason> & {
    /** Prevents the popup from unmounting until the `unmount` action is called. */
    preventUnmountOnClose: () => void;
  };

export namespace TooltipRoot {
  export type State = TooltipRootState;
  export type Props<Payload = unknown> = TooltipRootProps<Payload>;
  export type Actions = TooltipRootActions;
  export type ChangeEventReason = TooltipRootChangeEventReason;
  export type ChangeEventDetails = TooltipRootChangeEventDetails;
}

function TooltipInteractions<Payload>(props: {
  store: TooltipStore<Payload>;
  disabled: boolean;
  trackCursorAxis: 'none' | 'x' | 'y' | 'both';
}) {
  const store = untrack(() => props.store);
  const dismiss = useDismiss(store, {
    get enabled() {
      return !props.disabled;
    },
    referencePress: () => store.select('closeOnClick'),
  });
  const clientPoint = useClientPoint(store, {
    get enabled() {
      return !props.disabled && props.trackCursorAxis !== 'none';
    },
    get axis() {
      return props.trackCursorAxis === 'none' ? undefined : props.trackCursorAxis;
    },
  });

  // Both hooks return `trigger: reference` (same object identity), so the active and
  // inactive trigger props can never differ. `useClientPoint` has no floating-side props.
  const triggerProps = createMemo(
    () => mergePropsSnapshot(clientPoint.reference, dismiss.reference) as HTMLProps,
  );
  usePopupInteractionProps(store, () => ({
    activeTriggerProps: triggerProps(),
    inactiveTriggerProps: triggerProps(),
    popupProps: dismiss.floating ?? (EMPTY_OBJECT as HTMLProps),
  }));

  return null;
}
