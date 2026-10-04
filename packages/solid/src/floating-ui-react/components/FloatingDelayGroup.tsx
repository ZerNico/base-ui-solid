import { createContext, createSignal, untrack, useContext } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useTimeout, Timeout } from '@base-ui-solid/utils/useTimeout';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';

import { getDelay } from '../hooks/useHoverShared';
import type { FloatingRootContext, Delay } from '../types';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

/**
 * Port note: `timeoutMs` is a getter so the context value can stay the same object.
 */
interface ContextValue {
  hasProvider: boolean;
  timeoutMs: number;
  delayRef: RefObject<Delay>;
  initialDelayRef: RefObject<Delay>;
  timeout: Timeout;
  currentIdRef: RefObject<string | null | undefined>;
  currentContextRef: RefObject<{
    onOpenChange: (open: boolean, eventDetails: BaseUIChangeEventDetails<any>) => void;
    setIsInstantPhase: (value: boolean) => void;
  } | null>;
}

const FloatingDelayGroupContext = createContext<ContextValue>({
  hasProvider: false,
  timeoutMs: 0,
  delayRef: { current: 0 },
  initialDelayRef: { current: 0 },
  timeout: new Timeout(),
  currentIdRef: { current: null },
  currentContextRef: { current: null },
});

function resetDelayRef(delayRef: RefObject<Delay>, initialDelayRef: RefObject<Delay>) {
  delayRef.current = initialDelayRef.current;
}

export interface FloatingDelayGroupProps {
  children?: JSX.Element | undefined;
  /**
   * The delay to use for the group when it's not in the instant phase.
   */
  delay: Delay;
  /**
   * An optional explicit timeout to use for the group, which represents when
   * grouping logic will no longer be active after the close delay completes.
   * This is useful if you want grouping to “last” longer than the close delay,
   * for example if there is no close delay at all.
   */
  timeoutMs?: number | undefined;
}

/**
 * Experimental next version of `FloatingDelayGroup` to become the default
 * in the future. This component is not yet stable.
 * Provides context for a group of floating elements that should share a
 * `delay`. Unlike `FloatingDelayGroup`, `useDelayGroup` with this
 * component does not cause a re-render of unrelated consumers of the
 * context when the delay changes.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 * @internal
 */
export function FloatingDelayGroup(props: FloatingDelayGroupProps): JSX.Element {
  const delayRef: RefObject<Delay> = { current: untrack(() => props.delay) };
  const initialDelayRef: RefObject<Delay> = { current: untrack(() => props.delay) };
  const currentIdRef: RefObject<string | null | undefined> = { current: null };
  const currentContextRef: ContextValue['currentContextRef'] = { current: null };
  const timeout = useTimeout();

  useIsoLayoutEffect(
    ([delay]) => {
      initialDelayRef.current = delay;

      if (!currentIdRef.current) {
        delayRef.current = delay;
        return;
      }

      delayRef.current = {
        open: getDelay(delayRef.current, 'open'),
        close: getDelay(delay, 'close'),
      };
    },
    () => [props.delay],
  );

  const value: ContextValue = {
    hasProvider: true,
    delayRef,
    initialDelayRef,
    currentIdRef,
    get timeoutMs() {
      return props.timeoutMs ?? 0;
    },
    currentContextRef,
    timeout,
  };

  return <FloatingDelayGroupContext value={value}>{props.children}</FloatingDelayGroupContext>;
}

/**
 * Port note: `open` is read lazily, so pass a getter (`{ get open() { return open(); } }`).
 */
interface UseDelayGroupOptions {
  /**
   * Whether the trigger this hook is used in has opened the tooltip.
   */
  open: boolean;
}

/**
 * Port note: `isInstantPhase` is a getter; read it in a reactive scope.
 */
interface UseDelayGroupReturn {
  /**
   * The id of the floating element keeping the delay group active.
   */
  activeIdRef: RefObject<string | null | undefined>;
  /**
   * The delay reference object.
   */
  delayRef: RefObject<Delay>;
  /**
   * Whether animations should be removed.
   */
  readonly isInstantPhase: boolean;
  /**
   * Whether a `<FloatingDelayGroup>` provider is present.
   */
  hasProvider: boolean;
}

/**
 * Enables grouping when called inside a component that's a child of a
 * `FloatingDelayGroup`.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 * @internal
 */
export function useDelayGroup(
  store: FloatingRootContext,
  options: UseDelayGroupOptions = { open: false },
): UseDelayGroupReturn {
  const open = () => options.open;

  const floatingId = store.useState('floatingId');

  const groupContext = useContext(FloatingDelayGroupContext);
  const { currentIdRef, delayRef, initialDelayRef, currentContextRef, hasProvider, timeout } =
    groupContext;

  const [isInstantPhase, setIsInstantPhase] = createSignal(false, { ownedWrite: true });
  let openRef = untrack(open);

  useIsoLayoutEffect(
    ([openValue]) => {
      openRef = openValue;
    },
    () => [open()],
  );

  useIsoLayoutEffect(
    ([openValue, floatingIdValue, timeoutMs]) => {
      function unset() {
        currentContextRef.current?.setIsInstantPhase(false);
        currentIdRef.current = null;
        currentContextRef.current = null;
        delayRef.current = initialDelayRef.current;
        timeout.clear();
      }

      if (!currentIdRef.current) {
        return undefined;
      }

      if (!openValue && currentIdRef.current === floatingIdValue) {
        setIsInstantPhase(false);

        if (timeoutMs) {
          const closingId = floatingIdValue;
          timeout.start(timeoutMs, () => {
            // If another tooltip has taken over the group, skip resetting.
            if (
              store.select('open') ||
              (currentIdRef.current && currentIdRef.current !== closingId)
            ) {
              return;
            }
            unset();
          });
          return () => {
            if (openRef || currentIdRef.current !== closingId) {
              timeout.clear();
            }
          };
        }

        unset();
      }

      return undefined;
    },
    () => [open(), floatingId(), groupContext.timeoutMs] as const,
  );

  useIsoLayoutEffect(
    ([openValue, floatingIdValue]) => {
      if (!openValue) {
        return;
      }

      const prevContext = currentContextRef.current;
      const prevId = currentIdRef.current;

      // A new tooltip is opening, so cancel any pending timeout that would reset
      // the group's delay back to the initial value.
      timeout.clear();
      currentContextRef.current = { onOpenChange: store.setOpen, setIsInstantPhase };
      currentIdRef.current = floatingIdValue;
      delayRef.current = {
        open: 0,
        close: getDelay(initialDelayRef.current, 'close'),
      };

      if (prevId !== null && prevId !== floatingIdValue) {
        setIsInstantPhase(true);
        prevContext?.setIsInstantPhase(true);
        prevContext?.onOpenChange(false, createChangeEventDetails(REASONS.none));
      } else {
        setIsInstantPhase(false);
        prevContext?.setIsInstantPhase(false);
      }
    },
    () => [open(), floatingId()] as const,
  );

  useIsoLayoutEffect(
    ([floatingIdValue]) => {
      return () => {
        if (currentIdRef.current === floatingIdValue) {
          currentContextRef.current = null;

          if (!openRef) {
            return;
          }

          currentIdRef.current = null;
          resetDelayRef(delayRef, initialDelayRef);
          timeout.clear();
        }
      };
    },
    () => [floatingId()],
  );

  return {
    activeIdRef: currentIdRef,
    hasProvider,
    delayRef,
    get isInstantPhase() {
      return isInstantPhase();
    },
  };
}
