import { onCleanup, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';

/**
 * Port note: React assigns imperative handles before ancestor layout effects. Solid runs parent
 * effects first, so attach synchronously too, and detach on replacement or owner disposal.
 */
export function useImperativeHandle<T>(ref: Accessor<RefObject<T | null> | undefined>, handle: T) {
  let attachedRef: RefObject<T | null> | undefined;
  const detach = () => {
    if (attachedRef?.current === handle) {
      attachedRef.current = null;
    }
    attachedRef = undefined;
  };
  const attach = (nextRef: RefObject<T | null> | undefined) => {
    detach();
    attachedRef = nextRef;
    if (nextRef) {
      nextRef.current = handle;
    }
  };
  attach(untrack(ref));
  onCleanup(detach);
  useIsoLayoutEffect(
    ([nextRef]) => {
      attach(nextRef);
      return detach;
    },
    () => [ref()],
  );
}
