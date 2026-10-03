import { createSignal, onCleanup, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useCompositeListContext } from './CompositeListContext';
import type { CompositeListRegistration } from './CompositeListContext';

export interface UseCompositeListItemParameters<Metadata> {
  /**
   * Whether to guess the initial index from render order, avoiding an update after mount for
   * flat lists.
   * @default false
   */
  guess?: boolean | undefined;
  index?: Accessor<number | undefined> | undefined;
  label?: Accessor<string | null | undefined> | undefined;
  /**
   * Metadata published with the item. Keep object values referentially stable to avoid
   * unnecessarily re-registering the item.
   */
  metadata?: Accessor<Metadata | undefined> | undefined;
  textRef?: RefObject<HTMLElement | null> | undefined;
}

interface UseCompositeListItemReturnValue {
  ref: (node: HTMLElement | null) => void;
  index: Accessor<number>;
}

/**
 * Used to register a list item and its index (DOM position) in the `CompositeList`.
 */
export function useCompositeListItem<Metadata>(
  params: UseCompositeListItemParameters<Metadata> = {},
): UseCompositeListItemReturnValue {
  const { guess, textRef } = params;
  const externalIndex = () => params.index?.();

  const { register, unregister, update, subscribeMapChange, nextIndexRef } =
    useCompositeListContext();

  // Guess the index from the render order. This avoids an update after mount for
  // flat lists rendered in DOM order; when the guess is wrong (grouped or out-of-order
  // rendering), the list flush corrects it before paint.
  let guessedIndex = -1;
  if (untrack(externalIndex) == null && guess) {
    guessedIndex = nextIndexRef.current;
    nextIndexRef.current += 1;
  }

  const [internalIndex, setInternalIndex] = createSignal(guessedIndex);
  const index = () => externalIndex() ?? internalIndex();

  let componentNode: Element | null = null;
  // The registration this item last published for `componentNode`.
  let registration: CompositeListRegistration<Metadata> | null = null;

  const getRegistration = (): CompositeListRegistration<Metadata> => ({
    metadata: params.metadata?.() ?? null,
    index: externalIndex() ?? null,
    label: params.label?.(),
    textRef,
  });

  // Nested items sharing one DOM node rely on ref attachment order to decide which
  // registration wins.
  const ref = (node: HTMLElement | null) => {
    const previousNode = componentNode;

    if (previousNode) {
      unregister(previousNode);
    }

    componentNode = node;

    if (node) {
      registration = untrack(getRegistration);
      register(node, registration);
    } else {
      registration = null;
    }
  };

  // Upstream recreates the callback ref when the registration changes, which re-registers the
  // item. Solid calls refs once, so republish explicitly (see `CompositeListContextValue.update`).
  let isFirstRegistrationRun = true;
  useIsoLayoutEffect(
    ([metadata, currentExternalIndex, label]) => {
      if (isFirstRegistrationRun) {
        isFirstRegistrationRun = false;
        return;
      }
      if (componentNode && registration) {
        const nextRegistration: CompositeListRegistration<Metadata> = {
          metadata: metadata ?? null,
          index: currentExternalIndex ?? null,
          label,
          textRef,
        };
        update(componentNode, registration, nextRegistration);
        registration = nextRegistration;
      }
    },
    () => [params.metadata?.(), externalIndex(), params.label?.()],
  );

  // Subscribed synchronously (not in an effect, as upstream does) so the item doesn't miss the
  // list's first flush, which can run before the item's effects.
  const unsubscribe = subscribeMapChange((map) => {
    if (untrack(externalIndex) != null) {
      return;
    }

    const i = componentNode ? (map.get(componentNode) as any)?.index : null;

    if (i != null) {
      setInternalIndex(i);
    }
  });
  onCleanup(() => {
    unsubscribe();
    // Solid doesn't call refs with `null` on unmount, so unregister when the item is disposed.
    if (componentNode) {
      unregister(componentNode);
      componentNode = null;
      registration = null;
    }
  });

  return { ref, index };
}
