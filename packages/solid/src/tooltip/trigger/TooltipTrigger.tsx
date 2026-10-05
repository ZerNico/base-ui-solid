import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { isElement } from '@floating-ui/utils/dom';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useValueAsRef } from '@base-ui-solid/utils/useValueAsRef';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import type { BaseUIComponentProps, BaseUIEvent, HTMLProps } from '../../internals/types';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import { usePopupHandleStore, useTriggerDataForwarding } from '../../utils/popups';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { TooltipHandle } from '../store/TooltipHandle';
import type { TooltipHandleStore } from '../store/TooltipStore';
import { useTooltipProviderContext } from '../provider/TooltipProviderContext';
import {
  safePolygon,
  useDelayGroup,
  useFocus,
  useHoverReferenceInteraction,
} from '../../floating-ui-solid';
import { closest, contains, getTarget } from '../../floating-ui-solid/utils/element';
import { isMouseLikePointerType } from '../../floating-ui-solid/utils/event';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useHoverInteractionSharedState } from '../../floating-ui-solid/hooks/useHoverInteractionSharedState';
import { getDelay } from '../../floating-ui-solid/hooks/useHoverShared';
import * as TooltipTriggerDataAttributes from './TooltipTriggerDataAttributes';

import { OPEN_DELAY } from '../utils/constants';

const TOOLTIP_TRIGGER_IDENTIFIER = 'data-base-ui-tooltip-trigger';

function getTargetElement(event: Event): Element | null {
  const target = getTarget(event);
  return isElement(target) ? target : null;
}

/**
 * An element to attach the tooltip to.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui-solid.pages.dev/solid/components/tooltip)
 */
export function TooltipTrigger<Payload>(
  componentProps: TooltipTrigger.Props<Payload>,
): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'handle',
    'payload',
    'disabled',
    'delay',
    'closeOnClick',
    'closeDelay',
    'id',
  );

  const closeOnClick = () => componentProps.closeOnClick ?? true;

  const rootContext = useTooltipRootContext(true);
  // Port note: `usePopupHandleStore` reads its handle once, so it's recreated (with its
  // subscription) when the `handle` prop changes, like upstream re-subscribing to the new handle.
  const handleStoreAccessor = createMemo(() => usePopupHandleStore(componentProps.handle));
  const handleStore = () => handleStoreAccessor()();
  if (!untrack(handleStore) && !rootContext) {
    throw new Error(
      'Base UI: <Tooltip.Trigger> must be either used within a <Tooltip.Root> component or provided with a handle.',
    );
  }
  const store = createMemo(() => (handleStore() ?? rootContext) as TooltipHandleStore<Payload>);

  const generatedId = useBaseUiId();
  const thisTriggerId = createMemo(() => (componentProps.id as string | undefined) ?? generatedId);

  const triggerElementRef: RefObject<Element | null> = { current: null };

  const closeDelayWithDefault = () => componentProps.closeDelay ?? 0;

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef,
    store,
    () => ({
      payload: componentProps.payload,
      closeOnClick: closeOnClick(),
      closeDelay: closeDelayWithDefault(),
    }),
  );

  const providerDelay = useTooltipProviderContext();

  const isNestedTriggerHoveredRef = { current: false };
  const nestedTriggerOpenTimeout = useTimeout();
  // Local copy so it can be cleared on mouseLeave without resetting the hover hook's own pointerType.
  const pointerTypeRef: { current: string | undefined } = { current: undefined };

  // Port note: a detached trigger follows its handle's store, which changes when a root attaches
  // or detaches. Upstream re-renders and its hooks pick up the new store's floating root context;
  // here the hooks bound to a store are created per store, and disposed when it changes.
  const storeParts = createMemo(() => {
    const currentStore = store();
    return untrack(() => useStoreParts(currentStore));
  });

  function useStoreParts(currentStore: TooltipHandleStore<Payload>) {
    const isTriggerActive = currentStore.useState('isTriggerActive', thisTriggerId);
    const isOpenedByThisTrigger = currentStore.useState('isOpenedByTrigger', thisTriggerId);
    // Port note: a store's floating root context never changes.
    const floatingRootContext = currentStore.select('floatingRootContext');

    const delayGroup = useDelayGroup(floatingRootContext, {
      get open() {
        return isOpenedByThisTrigger();
      },
    });
    const hoverInteraction = useHoverInteractionSharedState(floatingRootContext);

    currentStore.useSyncedValue('isInstantPhase', () => delayGroup.isInstantPhase);

    const rootDisabled = currentStore.useState('disabled');
    const disabled = () => componentProps.disabled ?? rootDisabled();
    const trackCursorAxis = currentStore.useState('trackCursorAxis');
    const disableHoverablePopup = currentStore.useState('disableHoverablePopup');

    const hoverProps = useHoverReferenceInteraction(floatingRootContext, {
      get enabled() {
        return !disabled();
      },
      mouseOnly: true,
      move: false,
      get handleClose() {
        return !disableHoverablePopup() && trackCursorAxis() !== 'both' ? safePolygon() : null;
      },
      restMs: getOpenDelay,
      delay() {
        if (componentProps.closeDelay == null && delayGroup.hasProvider) {
          return { close: getDelay(delayGroup.delayRef.current, 'close') };
        }
        return { close: closeDelayWithDefault() };
      },
      triggerElementRef,
      get isActiveTrigger() {
        return isTriggerActive();
      },
      isClosing: () => currentStore.select('transitionStatus') === 'ending',
      shouldOpen() {
        // Port note: React refreshes the delayed handler's render snapshot. Solid's stable
        // handler checks current ownership so a pending hover cannot re-announce an external open.
        return (
          !isNestedTriggerHoveredRef.current &&
          !currentStore.select('isOpenedByTrigger', untrack(thisTriggerId))
        );
      },
    });

    const focusProps = useFocus(floatingRootContext, {
      get enabled() {
        return !disabled();
      },
    });

    const rootTriggerProps = currentStore.useState('triggerProps', isMountedByThisTrigger);

    return {
      isOpenedByThisTrigger,
      delayGroup,
      hoverInteraction,
      disabled,
      trackCursorAxis,
      hoverProps,
      focusProps,
      rootTriggerProps,
    };
  }

  const disabled = () => storeParts().disabled();
  const disabledRef = useValueAsRef(disabled);

  function getOpenDelay() {
    const { delayGroup } = storeParts();
    // Adjacent tooltips open instantly while the group is active.
    if (delayGroup.hasProvider && delayGroup.activeIdRef.current != null) {
      return 0;
    }
    return componentProps.delay ?? providerDelay() ?? OPEN_DELAY;
  }

  function isEnabledNestedTriggerTarget(target: Element | null) {
    const triggerEl = triggerElementRef.current;
    if (!triggerEl || !target) {
      return false;
    }

    const nearestTrigger = closest(target, `[${TOOLTIP_TRIGGER_IDENTIFIER}]`);
    return (
      nearestTrigger !== null && nearestTrigger !== triggerEl && contains(triggerEl, nearestTrigger)
    );
  }

  function detectNestedTriggerHover(target: Element | null) {
    const nestedTriggerHovered = isEnabledNestedTriggerTarget(target);

    isNestedTriggerHoveredRef.current = nestedTriggerHovered;
    if (nestedTriggerHovered) {
      const { hoverInteraction } = untrack(storeParts);
      hoverInteraction.openChangeTimeout.clear();
      hoverInteraction.restTimeout.clear();
      hoverInteraction.restTimeoutPending = false;
      nestedTriggerOpenTimeout.clear();
    }
    return nestedTriggerHovered;
  }

  const handleNestedTriggerHover = (event: MouseEvent) => {
    const currentStore = untrack(store);
    const wasNestedTriggerHovered = isNestedTriggerHoveredRef.current;
    const target = getTargetElement(event);
    const nestedTriggerHovered = detectNestedTriggerHover(target);
    const triggerEl = triggerElementRef.current as HTMLElement | null;
    const targetInsideTrigger = triggerEl && target && contains(triggerEl, target);

    // Only close hover-opened parents. Focus/click-like opens remain owned by
    // their original interaction and should not be clobbered by nested hover.
    if (
      nestedTriggerHovered &&
      currentStore.select('open') &&
      currentStore.select('lastOpenChangeReason') === REASONS.triggerHover
    ) {
      currentStore.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
      return;
    }

    if (
      wasNestedTriggerHovered &&
      !nestedTriggerHovered &&
      targetInsideTrigger &&
      !disabledRef.current &&
      !currentStore.select('open') &&
      triggerEl &&
      // Match the hover hook's non-strict mouse fallback for mouse-only event sequences.
      isMouseLikePointerType(pointerTypeRef.current)
    ) {
      const open = () => {
        const latestStore = untrack(store);
        if (
          !isNestedTriggerHoveredRef.current &&
          !disabledRef.current &&
          !latestStore.select('open')
        ) {
          latestStore.setOpen(
            true,
            createChangeEventDetails(REASONS.triggerHover, event, triggerEl),
          );
        }
      };

      const openDelay = untrack(getOpenDelay);

      // With `move: false`, the hover hook only listens to mouseenter/mouseleave
      // on the parent trigger. Leaving a nested child for the parent area fires
      // no event the hook can react to, so reopen locally.
      if (openDelay === 0) {
        nestedTriggerOpenTimeout.clear();
        open();
      } else {
        nestedTriggerOpenTimeout.start(openDelay, open);
      }
    }
  };

  const shouldApplyRootTriggerProps = () =>
    isMountedByThisTrigger() || storeParts().trackCursorAxis() !== 'none';

  const state = createMemo<TooltipTriggerState>(
    () => ({
      open: storeParts().isOpenedByThisTrigger(),
    }),
    { equals: fastObjectShallowCompare },
  );

  // React's `onFocus` bubbles, so it maps to `onFocusIn`.
  const ownProps: HTMLProps = {
    onMouseOver(event: MouseEvent) {
      handleNestedTriggerHover(event);
    },
    onFocusIn(event: FocusEvent) {
      if (isEnabledNestedTriggerTarget(getTargetElement(event))) {
        (event as BaseUIEvent<FocusEvent>).preventBaseUIHandler();
      }
    },
    onMouseLeave() {
      isNestedTriggerHoveredRef.current = false;
      nestedTriggerOpenTimeout.clear();
      pointerTypeRef.current = undefined;
    },
    onPointerEnter(event: PointerEvent) {
      pointerTypeRef.current = event.pointerType;
    },
    onPointerDown(event: PointerEvent) {
      const currentStore = untrack(store);
      const closeOnClickValue = untrack(closeOnClick);
      pointerTypeRef.current = event.pointerType;
      currentStore.set('closeOnClick', closeOnClickValue);
      if (closeOnClickValue && !currentStore.select('open')) {
        currentStore.cancelPendingOpen(event);
      }
    },
    onClick(event: MouseEvent) {
      const currentStore = untrack(store);
      if (untrack(closeOnClick) && !currentStore.select('open')) {
        currentStore.cancelPendingOpen(event);
      }
    },
  };

  return useRenderElement('button', componentProps, {
    state,
    ref: [
      registerTrigger,
      (element: Element | null) => {
        triggerElementRef.current = element;
      },
    ],
    props: () => {
      const parts = storeParts();
      return [
        parts.hoverProps(),
        parts.focusProps.reference,
        shouldApplyRootTriggerProps() ? parts.rootTriggerProps() : undefined,
        {
          ...ownProps,
          id: thisTriggerId(),
          [TooltipTriggerDataAttributes.triggerDisabled]: disabled() ? '' : undefined,
          [TOOLTIP_TRIGGER_IDENTIFIER]: disabled() ? undefined : '',
        },
        elementProps,
      ];
    },
    stateAttributesMapping: triggerOpenStateMapping,
  });
}

export interface TooltipTriggerState {
  /**
   * Whether the tooltip is currently open and was opened by this trigger.
   */
  open: boolean;
}

export interface TooltipTriggerProps<Payload = unknown> extends BaseUIComponentProps<
  'button',
  TooltipTriggerState
> {
  /**
   * A handle to associate the trigger with a tooltip.
   */
  handle?: TooltipHandle<Payload> | undefined;
  /**
   * A payload to pass to the tooltip when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * How long to wait before opening the tooltip on hover. Specified in milliseconds.
   * @default 600
   */
  delay?: number | undefined;
  /**
   * Whether the tooltip should close when this trigger is clicked.
   * @default true
   */
  closeOnClick?: boolean | undefined;
  /**
   * How long to wait before closing the tooltip. Specified in milliseconds.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * If `true`, the tooltip will not open when interacting with this trigger.
   * Note that this doesn't apply the `disabled` attribute to the trigger element.
   * If you want to disable the trigger element itself, you can pass the `disabled` prop to the trigger element via the `render` prop.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace TooltipTrigger {
  export type State = TooltipTriggerState;
  export type Props<Payload = unknown> = TooltipTriggerProps<Payload>;
}
