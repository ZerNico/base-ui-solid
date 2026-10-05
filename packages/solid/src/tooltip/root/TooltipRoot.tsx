import { createMemo, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useImperativeHandle } from '../../internals/useImperativeHandle';
import { TooltipRootContext } from './TooltipRootContext';
import { useClientPoint, useDismiss } from '../../floating-ui-solid';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import {
  usePopupHandleAttachment,
  useImplicitActiveTrigger,
  usePopupRootStore,
  useOpenStateTransitions,
  usePopupInteractionProps,
} from '../../utils/popups';
import type { PayloadChildRenderFunction } from '../../utils/popups';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { TooltipStore } from '../store/TooltipStore';
import type { State as TooltipStoreState } from '../store/TooltipStore';
import type { TooltipHandle } from '../store/TooltipHandle';
import { REASONS } from '../../internals/reasons';
import type { HTMLProps } from '../../internals/types';

/**
 * Groups all parts of the tooltip.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipRoot<Payload>(props: TooltipRoot.Props<Payload>): JSX.Element {
  const disabled = () => props.disabled ?? false;
  const disableHoverablePopup = () => props.disableHoverablePopup ?? false;
  const trackCursorAxis = () => props.trackCursorAxis ?? 'none';

  const store = usePopupRootStore(
    (floatingId, nested) =>
      new TooltipStore<Payload>(
        {
          open: props.defaultOpen ?? false,
          openProp: props.open,
          activeTriggerId: props.defaultTriggerId ?? null,
          triggerIdProp: props.triggerId,
        },
        floatingId,
        nested,
      ),
  );

  store.useControlledProp('openProp', () => props.open);
  store.useControlledProp('triggerIdProp', () => props.triggerId);

  store.useContextCallback('onOpenChange', () => props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', () => props.onOpenChangeComplete);

  const openState = store.useState('open');
  const open = createMemo(() => !disabled() && openState());

  const activeTriggerId = store.useState('activeTriggerId');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload') as () => Payload | undefined;

  store.useSyncedValues(() => ({
    trackCursorAxis: trackCursorAxis(),
    disableHoverablePopup: disableHoverablePopup(),
    disabled: disabled(),
  }));

  useImplicitActiveTrigger(store, { closeOnActiveTriggerUnmount: true });
  const { forceUnmount, transitionStatus } = useOpenStateTransitions(open, store);
  const isInstantPhase = store.useState('isInstantPhase');
  const instantType = store.useState('instantType');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');

  // Animations should be instant in two cases:
  // 1) Opening during the provider's instant phase (adjacent tooltip opens instantly)
  // 2) Closing because another tooltip opened (reason === 'none')
  // Otherwise, allow the animation to play. In particular, do not disable animations
  // during the 'ending' phase unless it's due to a sibling opening.
  const previousInstantTypeRef: {
    current: TooltipStoreState<Payload>['instantType'] | null;
  } = { current: null };

  useIsoLayoutEffect(
    ([openStateValue, disabledValue]) => {
      if (openStateValue && disabledValue) {
        store.setOpen(false, createChangeEventDetails(REASONS.disabled));
      }
    },
    () => [openState(), disabled(), store],
  );

  useIsoLayoutEffect(
    ([transitionStatusValue, isInstantPhaseValue, lastOpenChangeReasonValue, instantTypeValue]) => {
      if (
        (transitionStatusValue === 'ending' && lastOpenChangeReasonValue === REASONS.none) ||
        (transitionStatusValue !== 'ending' && isInstantPhaseValue)
      ) {
        // Capture the current instant type so we can restore it later
        // and set to 'delay' to disable animations while moving from one trigger to another
        // within a delay group.
        if (instantTypeValue !== 'delay') {
          previousInstantTypeRef.current = instantTypeValue;
        }
        store.set('instantType', 'delay');
      } else if (previousInstantTypeRef.current !== null) {
        store.set('instantType', previousInstantTypeRef.current);
        previousInstantTypeRef.current = null;
      }
    },
    () =>
      [transitionStatus(), isInstantPhase(), lastOpenChangeReason(), instantType(), store] as const,
  );

  useIsoLayoutEffect(
    ([, activeTriggerIdValue, openValue]) => {
      if (openValue) {
        if (activeTriggerIdValue == null) {
          store.set('payload', undefined);
        }
      }
    },
    () => [store, activeTriggerId(), open()] as const,
  );

  useImperativeHandle(() => props.actionsRef, {
    unmount: forceUnmount,
    close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
  });

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

  // Port note: a render function child is called once with an object whose `payload` is a getter,
  // so read `arg.payload` in a reactive scope instead of destructuring it. Like Solid's `<Show>`,
  // only a function that declares a parameter is a render function: a single component child is
  // also passed as a function.
  const renderChildren = () => {
    const children = props.children;
    if (typeof children === 'function' && children.length > 0) {
      return untrack(() =>
        (children as PayloadChildRenderFunction<Payload>)({
          get payload() {
            return payload();
          },
        }),
      );
    }
    return children as JSX.Element;
  };

  return (
    <TooltipRootContext value={store as TooltipRootContext}>
      <Show when={shouldRenderInteractions()}>
        <TooltipInteractions
          store={store}
          disabled={disabled()}
          trackCursorAxis={trackCursorAxis()}
        />
      </Show>
      {renderChildren()}
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
  // Port note: the root store's floating root context never changes.
  const floatingRootContext = store.select('floatingRootContext');

  const dismiss = useDismiss(floatingRootContext, {
    get enabled() {
      return !props.disabled;
    },
    referencePress: () => store.select('closeOnClick'),
  });
  const clientPoint = useClientPoint(floatingRootContext, {
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
