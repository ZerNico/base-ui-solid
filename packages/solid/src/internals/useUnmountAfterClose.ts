import { createMemo, flush, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useTransitionStatus } from './useTransitionStatus';
import { useOpenChangeComplete } from './useOpenChangeComplete';

/**
 * Port note: `open` and `preventUnmountOnClose` are accessors; the callbacks are read when called.
 */
export interface UseUnmountAfterCloseParameters {
  /**
   * Whether the popup is open.
   */
  open: Accessor<boolean>;
  /**
   * Ref to the element whose closing animations are awaited before unmounting.
   */
  ref: RefObject<HTMLElement | null>;
  /**
   * Whether the current close cycle asked to keep the popup mounted until the `unmount` action
   * is called. Ignored while `open`.
   */
  preventUnmountOnClose: Accessor<boolean>;
  /**
   * Writes `preventUnmountOnClose`. Opening starts a new close cycle, so the hook clears it
   * whenever `open` becomes `true`.
   */
  setPreventUnmountOnClose: (preventUnmountOnClose: boolean) => void;
  /**
   * Runs once per unmount, whether it completed automatically or through `forceUnmount`.
   */
  onUnmount: () => void;
  /**
   * Whether a popup that mounts already open should still play its enter transition.
   * See `useTransitionStatus`.
   */
  animateInitialOpen?: boolean | undefined;
}

/**
 * Keeps a popup mounted through its closing animation and unmounts it once the animation
 * finishes, unless the close cycle opted out through `preventUnmountOnClose`.
 * Store-agnostic: hosts sync `mounted` and `transitionStatus` wherever they need them.
 *
 * Port note: `mounted`, `transitionStatus` and `preventUnmountingOnClose` are returned as accessors.
 *
 * @returns `forceUnmount` unmounts the popup immediately. It is a no-op once the popup is already
 *   unmounted, so calling it after the automatic unmount doesn't repeat the completion callback,
 *   and a call while the popup is open only takes effect if a close commits in the same batch.
 */
export function useUnmountAfterClose(parameters: UseUnmountAfterCloseParameters) {
  const { open, ref, preventUnmountOnClose } = parameters;
  const setPreventUnmountOnClose = (value: boolean) => parameters.setPreventUnmountOnClose(value);

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(
    open,
    false,
    false,
    parameters.animateInitialOpen,
  );

  // Opening starts a new close cycle. Derive it so the close-completion hook below reads the
  // value on the same pass, and clear the stored value so it doesn't leak into the next close.
  // The effect only runs when `open` changes, so an opt-out recorded while a controlled close is
  // still pending is not cleared.
  const preventUnmountingOnClose = createMemo(() => (open() ? false : preventUnmountOnClose()));
  useIsoLayoutEffect(
    ([isOpen]) => {
      if (isOpen) {
        setPreventUnmountOnClose(false);
      }
    },
    () => [open()],
  );

  // Mirrors `mounted` synchronously so repeated `forceUnmount()` calls in one batch complete
  // closing once.
  let mountedRef = untrack(mounted);

  const unmount = () => {
    mountedRef = false;
    setMounted(false);
    parameters.onUnmount();
  };

  useIsoLayoutEffect(
    ([isMounted]) => {
      mountedRef = isMounted;
    },
    () => [mounted()],
  );

  const forceUnmount = () => {
    if (!mountedRef) {
      return;
    }
    if (untrack(open)) {
      // Port note: upstream defers the decision to the next commit (a close may be batched with
      // this call: `close(); unmount()`). Solid batches until the microtask flush, so decide
      // after it: unmount if the popup closed, otherwise drop the call.
      queueMicrotask(() => {
        flush();
        if (!untrack(open) && mountedRef) {
          unmount();
        }
      });
      return;
    }
    unmount();
  };

  useOpenChangeComplete({
    enabled: () => mounted() && !open() && !preventUnmountingOnClose(),
    open,
    ref: () => ref.current,
    onComplete() {
      if (!untrack(open)) {
        forceUnmount();
      }
    },
  });

  return { mounted, transitionStatus, preventUnmountingOnClose, forceUnmount };
}
