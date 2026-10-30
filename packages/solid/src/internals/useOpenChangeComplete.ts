import type { Accessor } from 'solid-js';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useAnimationsFinished } from './useAnimationsFinished';

/**
 * Calls the provided function when the CSS open/close animation or transition completes.
 */
export function useOpenChangeComplete(parameters: UseOpenChangeCompleteParameters) {
  const { enabled = () => true, open = () => undefined, ref, batch = false } = parameters;

  const runOnceAnimationsFinish = useAnimationsFinished(ref, () => Boolean(open()), batch);

  useEffect(
    ([isEnabled]) => {
      if (!isEnabled) {
        return undefined;
      }

      const abortController = new AbortController();

      runOnceAnimationsFinish(() => parameters.onComplete(), abortController.signal);

      return () => {
        abortController.abort();
      };
    },
    () => [enabled(), open(), parameters.restartKey?.()],
  );
}

export interface UseOpenChangeCompleteParameters {
  /**
   * Whether the hook is enabled.
   * @default true
   */
  enabled?: Accessor<boolean> | undefined;
  /**
   * Whether the element is open.
   */
  open?: Accessor<boolean | undefined> | undefined;
  /**
   * Accessor to the element being closed.
   */
  ref: () => HTMLElement | null | undefined;
  /**
   * Whether completions ready in the same microtask may be coalesced into a single flush.
   * Only safe when `onComplete` doesn't read state that another completion can change.
   * @default false
   */
  batch?: boolean | undefined;
  /**
   * Restarts the wait when it changes, such as when the element attaches after the wait started.
   * Port note: an accessor.
   */
  restartKey?: Accessor<unknown> | undefined;
  /**
   * Function to call when the animation completes (or there is no animation).
   */
  onComplete: () => void;
}

export interface UseOpenChangeCompleteState {}
