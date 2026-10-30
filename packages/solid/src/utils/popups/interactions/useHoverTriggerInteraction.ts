import { createMemo, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { isElement } from '@floating-ui/utils/dom';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import { REASONS } from '../../../internals/reasons';
import type { FloatingUIOpenChangeDetails, HTMLProps } from '../../../internals/types';
import { useFloatingTree } from '../tree/FloatingTree';
import type { FloatingTreeStore } from '../tree/FloatingTreeStore';
import type { Delay, PopupInteractionStore } from '../types';
import { contains } from '../element';
import { getHoverIntent } from './hoverIntent';
import type { HoverIntentTriggerOptions } from './hoverIntent';
import type { HandleClose, HandleCloseContextBase } from './useHoverShared';

/**
 * Port note: read lazily like Solid props (`props.x`), so pass a props-like object with getters
 * for reactive options. `externalTree` and `triggerElementRef` are read once.
 */
export interface UseHoverTriggerInteractionProps {
  enabled?: boolean | undefined;
  handleClose?: HandleClose | null | undefined;
  restMs?: number | (() => number) | undefined;
  delay?: Delay | (() => Delay) | undefined;
  move?: boolean | undefined;
  mouseOnly?: boolean | undefined;
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Whether the hook controls the active trigger. When false, the props are
   * returned under the `trigger` key so they can be applied to inactive
   * triggers via `getTriggerProps`.
   * @default true
   */
  isActiveTrigger?: boolean | undefined;
  triggerElementRef?: Readonly<RefObject<Element | null>> | undefined;
  getHandleCloseContext?: (() => HandleCloseContextBase | null) | undefined;
  /**
   * Called before each hover-driven open attempt (immediate, delayed, and rest-ms
   * paths). Return `false` to veto; any other return value permits the open.
   */
  shouldOpen?: (() => boolean) | undefined;
  /**
   * Regression workaround (#5152): also cancels a pending hover-open from the
   * trigger's `mouseout`, backing up a `mouseleave` that Chrome can drop during
   * a fast pointer sweep and leave a submenu stuck open.
   *
   * WARNING: only enable on single-trigger, hover-driven roots (e.g.
   * `Menu.SubmenuTrigger`). It skips the `isClickLikeOpenEvent()` and
   * `isInsideEnabledTrigger()` checks `mouseleave` applies, so on a
   * multi-trigger or click-driven root it cancels legitimate opens/closes.
   * @default false
   */
  guardStaleOpen?: boolean | undefined;
}

const EMPTY_REF: Readonly<RefObject<Element | null>> = { current: null };

/**
 * Provides hover interactions that should be attached to trigger elements.
 *
 * Port note: returns an accessor of the props (`undefined` while disabled). Its event handlers
 * are created once.
 */
export function useHoverTriggerInteraction(
  store: PopupInteractionStore,
  props: UseHoverTriggerInteractionProps = {},
): Accessor<HTMLProps | undefined> {
  const enabled = () => props.enabled ?? true;
  const delay = () => props.delay ?? 0;
  const handleClose = () => props.handleClose ?? null;
  const mouseOnly = () => props.mouseOnly ?? false;
  const restMs = () => props.restMs ?? 0;
  const move = () => props.move ?? true;
  const isActiveTrigger = () => props.isActiveTrigger ?? true;
  const guardStaleOpen = () => props.guardStaleOpen ?? false;
  const triggerElementRef = props.triggerElementRef ?? EMPTY_REF;

  const { events } = store.context;

  const tree = useFloatingTree(props.externalTree);

  const intent = getHoverIntent(store);
  const isHoverCloseActiveRef = { current: false };

  // Port note: `useValueAsRef`. Each `current` reads the latest option.
  const handleCloseRef = {
    get current() {
      return handleClose();
    },
  };
  const delayRef = {
    get current() {
      return delay();
    },
  };
  const restMsRef = {
    get current() {
      return restMs();
    },
  };
  const enabledRef = {
    get current() {
      return enabled();
    },
  };

  function checkShouldOpen() {
    return props.shouldOpen?.() !== false;
  }

  // Port note: upstream assigns this during render: assign it now and whenever it changes.
  useEffect(
    ([isActive, handleCloseValue]) => {
      if (isActive) {
        // eslint-disable-next-line no-underscore-dangle
        intent.handleCloseOptions = handleCloseValue?.__options;
      }
    },
    () => [isActiveTrigger(), handleClose()],
  );
  untrack(() => {
    if (isActiveTrigger()) {
      // eslint-disable-next-line no-underscore-dangle
      intent.handleCloseOptions = handleClose()?.__options;
    }
  });

  // Clears the timers and the safe polygon when the trigger unmounts or moves to another store,
  // such as a detached trigger moving from its handle's fallback store to the Root's.
  // Port note: the hook is set up again for another store, so its owner's cleanup covers both.
  onCleanupWithWrites(() => {
    intent.cancelPendingOpen();
    intent.stopSafePolygon();
  });

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  useEffect(
    ([enabledValue]) => {
      if (!enabledValue) {
        return undefined;
      }

      function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
        if (!details.open) {
          isHoverCloseActiveRef.current = details.reason === REASONS.triggerHover;
          intent.cancel();
        } else {
          isHoverCloseActiveRef.current = false;
        }
      }

      events.on('openchange', onOpenChangeLocal);
      return () => {
        events.off('openchange', onOpenChangeLocal);
      };
    },
    () => [enabled()],
  );

  useEffect(
    ([enabledValue, isActive, mouseOnlyValue, moveValue, guardStaleOpenValue]) => {
      if (!enabledValue) {
        return undefined;
      }

      const trigger =
        (triggerElementRef.current as HTMLElement | null) ??
        (isActive ? (store.select('anchorElement') as HTMLElement | null) : null);

      if (!isElement(trigger)) {
        return undefined;
      }

      const options: HoverIntentTriggerOptions = {
        delay: delayRef,
        restMs: restMsRef,
        handleClose: handleCloseRef,
        enabled: enabledRef,
        isHoverCloseActive: isHoverCloseActiveRef,
        triggerElementRef,
        mouseOnly: mouseOnlyValue,
        tree,
        shouldOpen: checkShouldOpen,
        getHandleCloseContext: props.getHandleCloseContext,
      };

      function onMouseEnter(event: MouseEvent) {
        intent.onTriggerMouseEnter(event, options);
      }

      function onMouseLeave(event: MouseEvent) {
        intent.onTriggerMouseLeave(event, options);
      }

      // Backup cancellation for Chrome's dropped `mouseleave` — see `guardStaleOpen`.
      function onMouseOut(event: MouseEvent) {
        if (contains(trigger, event.relatedTarget as Element | null)) {
          return; // moved within the trigger's own subtree
        }
        intent.cancelPendingOpen();
      }

      const staleOpenGuard = guardStaleOpenValue
        ? addEventListener(trigger, 'mouseout', onMouseOut)
        : undefined;

      return mergeCleanups(
        moveValue && addEventListener(trigger, 'mousemove', onMouseEnter, { once: true }),
        addEventListener(trigger, 'mouseenter', onMouseEnter),
        addEventListener(trigger, 'mouseleave', onMouseLeave),
        staleOpenGuard,
      );
    },
    () =>
      [
        enabled(),
        isActiveTrigger(),
        mouseOnly(),
        move(),
        guardStaleOpen(),
        store,
        tree,
        triggerElementRef,
      ] as const,
  );

  function setPointerRef(event: PointerEvent) {
    intent.pointerType = event.pointerType;
  }

  const triggerProps: HTMLProps = {
    onPointerDown: setPointerRef,
    onPointerEnter: setPointerRef,
    onMouseMove(event: MouseEvent) {
      intent.onTriggerMouseMove(event, {
        restMs: restMsRef,
        mouseOnly: mouseOnly(),
        shouldOpen: checkShouldOpen,
      });
    },
  };

  return createMemo(() => (enabled() ? triggerProps : undefined));
}
