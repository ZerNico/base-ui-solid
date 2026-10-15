import { createMemo, flatten, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';

interface TriggerFocusGuardRefs {
  readonly beforeTriggerFocusGuardRef: RefObject<HTMLElement | null>;
  readonly triggerFocusTargetRef: RefObject<HTMLElement | null>;
}

/**
 * Renders the trigger's focus guards around the trigger element while `enabled` is true.
 *
 * Port note: upstream renders them in a keyed fragment around the trigger. A Solid fragment can
 * move the trigger when guards are added on both sides (array reconciliation replaces it with
 * the leading guard and re-inserts it), which drops its focus and cancels a native press-drag-
 * release click. So the guards are built in a memo (owned, and disposed when they're no longer
 * rendered) and inserted around the stable trigger node in a layout effect, which only moves
 * DOM nodes: Solid doesn't allow creating reactive primitives inside an effect callback.
 */
export function useInsertedTriggerFocusGuards(parameters: {
  enabled: Accessor<boolean>;
  refs: Accessor<TriggerFocusGuardRefs>;
  triggerElement: () => HTMLElement | null | undefined;
  renderGuard: (props: {
    guardRef: RefObject<HTMLElement | null>;
    onFocus: (event: FocusEvent) => void;
  }) => JSX.Element;
  onBeforeGuardFocus: (event: FocusEvent) => void;
  onAfterGuardFocus: (event: FocusEvent) => void;
}) {
  const guards = createMemo(() => {
    if (!parameters.enabled()) {
      return null;
    }
    const refs = parameters.refs();
    return untrack(() => ({
      // Port note: dev/HMR JSX can be accessor-backed; resolve it before native DOM insertion.
      before: flatten(
        parameters.renderGuard({
          guardRef: refs.beforeTriggerFocusGuardRef,
          onFocus: parameters.onBeforeGuardFocus,
        }),
      ) as HTMLElement,
      after: flatten(
        parameters.renderGuard({
          guardRef: refs.triggerFocusTargetRef,
          onFocus: parameters.onAfterGuardFocus,
        }),
      ) as HTMLElement,
    }));
  });

  useIsoLayoutEffect(
    ([currentGuards]) => {
      const triggerNode = parameters.triggerElement();
      const parentNode = triggerNode?.parentNode;
      if (!currentGuards || !triggerNode || !parentNode) {
        return undefined;
      }
      parentNode.insertBefore(currentGuards.before, triggerNode);
      parentNode.insertBefore(currentGuards.after, triggerNode.nextSibling);
      return () => {
        currentGuards.before.remove();
        currentGuards.after.remove();
      };
    },
    () => [guards()] as const,
  );
}
