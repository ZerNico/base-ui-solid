import { createMemo, createSignal, flush, onCleanup, Show, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { usePreviousValue } from '@base-ui-solid/utils/usePreviousValue';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import type { SolidStore } from '@base-ui-solid/utils/store';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useAnimationsFinished } from '../internals/useAnimationsFinished';
import type { StateAttributesMapping } from '../internals/getStateAttributesProps';
import { usePopupAutoResize } from './usePopupAutoResize';
import type { Dimensions } from '../floating-ui-solid/types';
import type { Side } from '../internals/useAnchorPositioning';
import { useDirection } from '../direction-provider';
import { adaptiveOrigin } from './adaptiveOriginMiddleware';
import * as CommonPopupCssVars from './CommonPopupCssVars';
import * as CommonViewportDataAttributes from './CommonViewportDataAttributes';

export const popupViewportStateMapping: StateAttributesMapping<{
  activationDirection: string | undefined;
}> = {
  activationDirection: (value) =>
    value
      ? {
          [CommonViewportDataAttributes.activationDirection]: value,
        }
      : null,
};

export interface PopupViewportState {
  /**
   * Direction from which the popup was activated, used for directional animations.
   */
  activationDirection: string | undefined;
  /**
   * Whether the viewport is currently transitioning between contents.
   */
  transitioning: boolean;
}

/**
 * Port note: also needs `subscribe` and `state` to capture the current content before a trigger change is
 * rendered (see `usePopupViewport`).
 */
type PopupViewportStore = Pick<
  SolidStore<any, any, any>,
  'useState' | 'set' | 'subscribe' | 'state'
>;

/**
 * Port note: read lazily (pass getters for reactive values); `store` is read once.
 */
export interface UsePopupViewportParameters {
  /**
   * Popup store instance for accessing shared popup state.
   */
  store: PopupViewportStore;
  /**
   * Side of the positioner relative to the trigger.
   */
  side: Side;
  /**
   * Viewport children to render in the current container.
   */
  children?: JSX.Element | undefined;
}

/**
 * Port note: `children` is created once and updates in place; `state` is an accessor.
 */
export interface UsePopupViewportResult {
  /**
   * The viewport children wrapped in current/previous containers as needed.
   */
  children: JSX.Element;
  /**
   * Viewport state used for data attributes and render prop styling.
   */
  state: Accessor<PopupViewportState>;
}

/**
 * Builds morphing viewport containers for popups that animate between trigger-based content.
 * Handles previous-content snapshots, auto-resize, and state attributes for transitions.
 */
export function usePopupViewport(parameters: UsePopupViewportParameters): UsePopupViewportResult {
  const store = untrack(() => parameters.store);

  const direction = useDirection();

  const activeTrigger = store.useState('activeTriggerElement') as Accessor<Element | null>;
  const activeTriggerId = store.useState('activeTriggerId') as Accessor<string | null>;
  const open = store.useState('open') as Accessor<boolean>;
  const payload = store.useState('payload') as Accessor<unknown>;
  const mounted = store.useState('mounted') as Accessor<boolean>;
  const popupElement = store.useState('popupElement') as Accessor<HTMLElement | null>;
  const positionerElement = store.useState('positionerElement') as Accessor<HTMLElement | null>;

  const previousActiveTrigger = usePreviousValue(() => (open() ? activeTrigger() : null));
  // Remount current content on trigger changes (and once more when payload lags) to avoid DOM reuse flashes.
  // The key bumps immediately on trigger switches, then again if the payload arrives on a later render.
  const currentContentKey = usePopupContentKey(activeTriggerId, payload);

  let capturedNode: HTMLElement | null = null;
  const [previousContentNode, setPreviousContentNode] = createSignal<HTMLElement | null>(null, {
    ownedWrite: true,
  });

  const [newTriggerOffset, setNewTriggerOffset] = createSignal<Offset | null>(null, {
    ownedWrite: true,
  });

  let currentContainer: HTMLDivElement | null = null;
  let previousContainer: HTMLDivElement | null = null;

  const onAnimationsFinished = useAnimationsFinished(() => currentContainer, true);
  const cleanupFrame = useAnimationFrame();
  let cleanupController: AbortController | null = null;

  const [previousContentDimensions, setPreviousContentDimensions] = createSignal<{
    width: number;
    height: number;
  } | null>(null, { ownedWrite: true });

  const [showStartingStyleAttribute, setShowStartingStyleAttribute] = createSignal(false, {
    ownedWrite: true,
  });

  useIsoLayoutEffect(
    () => {
      store.set('adaptiveOrigin', adaptiveOrigin);
      return () => {
        store.set('adaptiveOrigin', undefined);
      };
    },
    () => [store],
  );

  const handleMeasureLayout = () => {
    currentContainer?.style.setProperty('animation', 'none');
    currentContainer?.style.setProperty('transition', 'none');

    previousContainer?.style.setProperty('display', 'none');
  };

  const handleMeasureLayoutComplete = (previousDimensions: Dimensions | null) => {
    currentContainer?.style.removeProperty('animation');
    currentContainer?.style.removeProperty('transition');

    previousContainer?.style.removeProperty('display');

    if (previousDimensions) {
      setPreviousContentDimensions(previousDimensions);
    }
  };

  const armViewportCleanup = () => {
    cleanupController?.abort();
    const controller = new AbortController();
    cleanupController = controller;
    onAnimationsFinished(() => {
      setPreviousContentNode(null);
      setPreviousContentDimensions(null);
      capturedNode = null;
    }, controller.signal);
  };

  let lastHandledTrigger: Element | null = null;

  useIsoLayoutEffect(
    ([openValue, mountedValue]) => {
      if (!openValue || !mountedValue) {
        lastHandledTrigger = null;
      }
    },
    () => [open(), mounted()],
  );

  useIsoLayoutEffect(
    ([activeTriggerValue, previousActiveTriggerValue]) => {
      // When a trigger changes, set the captured children HTML to state,
      // so we can render both new and old content.
      if (
        activeTriggerValue &&
        previousActiveTriggerValue &&
        activeTriggerValue !== previousActiveTriggerValue &&
        lastHandledTrigger !== activeTriggerValue &&
        capturedNode
      ) {
        setPreviousContentNode(capturedNode);
        setShowStartingStyleAttribute(true);

        // Calculate the relative position between the previous and new trigger,
        // so we can pass it to the style hook for animation purposes.
        const offset = calculateRelativePosition(previousActiveTriggerValue, activeTriggerValue);
        setNewTriggerOffset(offset);

        lastHandledTrigger = activeTriggerValue;
      }
    },
    () => [activeTrigger(), previousActiveTrigger()],
  );

  // Arm cleanup after a trigger change, and re-arm it if the current container remounts
  // mid-transition when a lagging payload bumps `currentContentKey`. The remount discards
  // the running entry animation (and with transition-style CSS the replacement mounts at
  // final styles with no animation at all), so re-run the starting-style choreography —
  // otherwise the watcher either strands or fires before the previous container's exit
  // animation finishes.
  useIsoLayoutEffect(
    ([, previousContentNodeValue]) => {
      if (previousContentNodeValue == null) {
        return;
      }

      // Abort the stale watcher synchronously. The remount cancels the old container's
      // animations, and the resulting promise rejection would otherwise run the cleanup
      // in a microtask before the re-armed watcher below is in place.
      cleanupController?.abort();

      setShowStartingStyleAttribute(true);

      cleanupFrame.request(() => {
        // Port note: `ReactDOM.flushSync(() => setShowStartingStyleAttribute(false))`.
        setShowStartingStyleAttribute(false);
        flush();
        armViewportCleanup();
      });
    },
    () => [currentContentKey(), previousContentNode()],
  );

  // Capture a clone of the current content DOM subtree when not transitioning.
  // We can't store previous React nodes as they may be stateful; instead we capture DOM clones for visual continuity.
  // Port note: upstream captures after every render, and reads the capture of the previous render
  // when the trigger changes. Solid has no per-render effect, so the content is captured when the
  // store's active trigger changes, which happens before the new content is rendered.
  const captureCurrentContent = () => {
    // When a transition is in progress, we store the next content in capturedNodeRef.
    // This handles the case where the trigger changes multiple times before the transition finishes.
    // We want to always capture the latest content for the previous snapshot.
    // So clicking quickly on T1, T2, T3 will result in the following sequence:
    // 1. T1 -> T2: previousContent = T1, currentContent = T2
    // 2. T2 -> T3: previousContent = T2, currentContent = T3
    const source = currentContainer;
    if (!source) {
      return;
    }

    const wrapper = ownerDocument(source).createElement('div');
    for (const child of Array.from(source.childNodes)) {
      wrapper.appendChild(child.cloneNode(true));
    }

    capturedNode = wrapper;
  };

  let lastObservedTrigger: Element | null = store.state.activeTriggerElement;
  onCleanup(
    store.subscribe((state: { activeTriggerElement: Element | null }) => {
      if (state.activeTriggerElement !== lastObservedTrigger) {
        lastObservedTrigger = state.activeTriggerElement;
        captureCurrentContent();
      }
    }),
  );

  const isTransitioning = () => previousContentNode() != null;

  // Port note: React detaches the refs with `null` on unmount; the containers' owners do it here.
  const renderPreviousContainer = () => {
    let element!: HTMLDivElement;
    onCleanup(() => {
      if (previousContainer === element) {
        previousContainer = null;
      }
    });
    return (
      <div
        data-previous
        inert={inertValue(true)}
        ref={(node) => {
          element = node;
          previousContainer = node;
        }}
        style={
          {
            ...(previousContentDimensions()
              ? {
                  [CommonPopupCssVars.popupWidth]: `${previousContentDimensions()!.width}px`,
                  [CommonPopupCssVars.popupHeight]: `${previousContentDimensions()!.height}px`,
                }
              : null),
            position: 'absolute',
          } as JSX.CSSProperties
        }
        data-ending-style={showStartingStyleAttribute() ? undefined : ''}
      />
    );
  };

  const renderCurrentContainer = () => {
    let element!: HTMLDivElement;
    onCleanup(() => {
      if (currentContainer === element) {
        currentContainer = null;
      }
    });
    return (
      <div
        data-current
        ref={(node) => {
          element = node;
          currentContainer = node;
        }}
        data-starting-style={isTransitioning() && showStartingStyleAttribute() ? '' : undefined}
      >
        {parameters.children}
      </div>
    );
  };

  // Port note: the current container is keyed, so it (and its children) remount when the key
  // changes, like upstream's `key={currentContentKey}`.
  const childrenToRender = (
    <>
      <Show when={isTransitioning()}>{(_transitioning) => renderPreviousContainer()}</Show>
      <Show when={currentContentKey()} keyed>
        {(_key) => renderCurrentContainer()}
      </Show>
    </>
  );

  // When previousContentNode is present, imperatively populate the previous container with the cloned children.
  useIsoLayoutEffect(
    ([previousContentNodeValue]) => {
      const container = previousContainer;
      if (!container || !previousContentNodeValue) {
        return;
      }

      container.replaceChildren(...Array.from(previousContentNodeValue.childNodes));
    },
    () => [previousContentNode()],
  );

  usePopupAutoResize({
    get popupElement() {
      return popupElement();
    },
    get positionerElement() {
      return positionerElement();
    },
    get mounted() {
      return mounted();
    },
    get content() {
      return payload();
    },
    onMeasureLayout: handleMeasureLayout,
    onMeasureLayoutComplete: handleMeasureLayoutComplete,
    get side() {
      return parameters.side;
    },
    get direction() {
      return direction();
    },
  });

  const state = createMemo<PopupViewportState>(
    () => ({
      activationDirection: getActivationDirection(newTriggerOffset()),
      transitioning: isTransitioning(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return { children: childrenToRender, state };
}

type Offset = {
  horizontal: number;
  vertical: number;
};

/**
 * Returns a string describing the provided offset.
 * It describes both the horizontal and vertical offset, separated by a space.
 *
 * @param offset
 */
function getActivationDirection(offset: Offset | null): string | undefined {
  if (!offset) {
    return undefined;
  }

  return `${getValueWithTolerance(offset.horizontal, 5, 'right', 'left')} ${getValueWithTolerance(offset.vertical, 5, 'down', 'up')}`;
}

/**
 * Returns a label describing the value (positive/negative) treating values
 * within tolerance as zero.
 *
 * @param value Value to check
 * @param tolerance Tolerance to treat the value as zero.
 * @param positiveLabel
 * @param negativeLabel
 * @returns If 0 < abs(value) < tolerance, returns an empty string. Otherwise returns positiveLabel or negativeLabel.
 */
function getValueWithTolerance(
  value: number,
  tolerance: number,
  positiveLabel: string,
  negativeLabel: string,
) {
  if (value > tolerance) {
    return positiveLabel;
  }

  if (value < -tolerance) {
    return negativeLabel;
  }

  return '';
}

/**
 * Calculates the relative position between centers of two elements.
 */
function calculateRelativePosition(from: Element, to: Element): Offset {
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();

  const fromCenter = {
    x: fromRect.left + fromRect.width / 2,
    y: fromRect.top + fromRect.height / 2,
  };
  const toCenter = {
    x: toRect.left + toRect.width / 2,
    y: toRect.top + toRect.height / 2,
  };

  return {
    horizontal: toCenter.x - fromCenter.x,
    vertical: toCenter.y - fromCenter.y,
  };
}

/**
 * Returns a key that forces remounting content when triggers change or a payload is updated.
 */
function usePopupContentKey(
  activeTriggerId: Accessor<string | null>,
  payload: Accessor<unknown>,
): Accessor<string> {
  const [contentKey, setContentKey] = createSignal(0, { ownedWrite: true });
  let previousActiveTriggerId = untrack(activeTriggerId);
  let previousPayload = untrack(payload);
  let pendingPayloadUpdate = false;

  useIsoLayoutEffect(
    ([activeTriggerIdValue, payloadValue]) => {
      // Compare against the last committed values to decide whether we need a new DOM subtree.
      const triggerIdChanged = activeTriggerIdValue !== previousActiveTriggerId;
      const payloadChanged = payloadValue !== previousPayload;

      if (triggerIdChanged) {
        // Remount immediately on trigger change; remember if payload hasn't caught up yet.
        setContentKey((value) => value + 1);
        pendingPayloadUpdate = !payloadChanged;
      } else if (pendingPayloadUpdate && payloadChanged) {
        // Payload arrived a render later, so remount once more to avoid reusing the old <img>.
        setContentKey((value) => value + 1);
        pendingPayloadUpdate = false;
      }

      // Persist current values for the next render's comparison.
      previousActiveTriggerId = activeTriggerIdValue;
      previousPayload = payloadValue;
    },
    () => [activeTriggerId(), payload()],
  );

  return () => `${activeTriggerId() ?? 'current'}-${contentKey()}`;
}
