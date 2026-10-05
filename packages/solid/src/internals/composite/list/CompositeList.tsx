/* eslint-disable no-bitwise */
import { createSignal, onCleanup } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { CompositeListContext } from './CompositeListContext';
import type { CompositeListRegistration } from './CompositeListContext';

export type CompositeMetadata<CustomMetadata> = {
  index: number;
} & CustomMetadata;

interface CompositeListItem<Metadata> {
  index: number;
  element: HTMLElement;
  registration: CompositeListRegistration<Metadata>;
}

/**
 * Provides context for a list of items in a composite component.
 */
export function CompositeList<Metadata>(props: CompositeList.Props<Metadata>) {
  // Items register from their ref callbacks, which run while rendering or disposing, so the
  // tick is allowed to be written from owned scopes.
  const [mapTick, setMapTick] = createSignal(0, { ownedWrite: true });

  const listeners = createListeners();
  const map = createMap<Metadata>();
  const nextIndexRef: RefObject<number> = { current: 0 };
  let isDirty = true;
  let committedItems: readonly CompositeListItem<Metadata>[] | null = null;
  let mutationObserver: MutationObserver | null = null;

  // Item registrations happen while rendering. Schedule one update for the whole batch so refs
  // are rebuilt after the DOM is updated and before paint.
  function scheduleMapUpdate() {
    if (isDirty) {
      return;
    }

    isDirty = true;
    setMapTick((tick) => tick + 1);
  }

  function register(node: Element, registration: CompositeListRegistration<Metadata>) {
    map.set(node, registration);
    scheduleMapUpdate();
  }

  function unregister(node: Element) {
    map.delete(node);
    scheduleMapUpdate();
  }

  function update(
    node: Element,
    previous: CompositeListRegistration<Metadata>,
    next: CompositeListRegistration<Metadata>,
  ) {
    const current = map.get(node);
    // Another item that shares the node attached after this one and owns the entry.
    if (current !== undefined && current !== previous) {
      return;
    }
    map.set(node, next);
    scheduleMapUpdate();
  }

  function syncRefs(items: readonly CompositeListItem<Metadata>[]) {
    const nextMap = new Map<Element, CompositeMetadata<Metadata>>();
    const { elementsRef, labelsRef } = props;

    elementsRef.current.length = 0;
    if (labelsRef) {
      labelsRef.current.length = 0;
    }

    items.forEach((item) => {
      nextMap.set(item.element, {
        ...(item.registration.metadata ?? ({} as Metadata)),
        index: item.index,
      });

      elementsRef.current[item.index] = item.element;

      if (labelsRef) {
        labelsRef.current[item.index] =
          item.registration.label !== undefined
            ? item.registration.label
            : (item.registration.textRef?.current?.textContent ?? item.element.textContent);
      }
    });

    nextIndexRef.current = elementsRef.current.length;

    return nextMap;
  }

  function observe(sortedNodes: HTMLElement[]) {
    mutationObserver?.disconnect();
    mutationObserver = null;

    // A single item can't reorder.
    if (typeof MutationObserver !== 'function' || sortedNodes.length < 2) {
      return;
    }

    const observer = new MutationObserver((entries) => {
      // Only verify the order after a move: a node that was removed and later
      // re-added within the same batch. Additions and removals alone can't
      // change the relative order of the remaining items, and items that mount
      // or unmount re-sort through `register`/`unregister`.
      if (!hasMovedNode(entries)) {
        return;
      }

      let previousConnectedNode: Element | null = null;

      // If any connected node now appears before the previous connected node,
      // wrappers/items moved and the index map needs to be rebuilt.
      for (const node of sortedNodes) {
        if (!node.isConnected) {
          continue;
        }

        if (previousConnectedNode && sortByDocumentPosition(previousConnectedNode, node) > 0) {
          observer.disconnect();
          scheduleMapUpdate();
          return;
        }

        previousConnectedNode = node;
      }
    });

    mutationObserver = observer;

    // A reorder that changes item indexes must invert at least one adjacent pair
    // from the previous sorted order. Observing each pair's common parent catches
    // both direct item moves and ancestor wrapper moves at the boundary.
    const roots = new Set<Element>();
    for (let i = 1; i < sortedNodes.length; i += 1) {
      const root = getCommonAncestor(sortedNodes[i - 1], sortedNodes[i]);
      if (root) {
        roots.add(root);
      }
    }

    roots.forEach((root) => observer.observe(root, { childList: true }));
  }

  function flush() {
    const [items, automaticNodes] = getCompositeListSnapshot(map);
    const nextMap = syncRefs(items);

    const previousItems = committedItems;
    const changed =
      !previousItems ||
      previousItems.length !== items.length ||
      items.some((item, index) => {
        const previousItem = previousItems[index];
        return (
          item.index !== previousItem.index ||
          item.element !== previousItem.element ||
          item.registration.index !== previousItem.registration.index ||
          item.registration.metadata !== previousItem.registration.metadata
        );
      });

    observe(automaticNodes);
    committedItems = items;
    isDirty = false;

    if (!changed) {
      return;
    }

    listeners.forEach((listener) => listener(nextMap));
    props.onMapChange?.(nextMap);
  }

  useIsoLayoutEffect(
    ([elementsRef, labelsRef]) => {
      // Re-copy the last committed snapshot when the ref objects change.
      if (!isDirty && committedItems) {
        syncRefs(committedItems);
      }

      return () => {
        elementsRef.current = [];
        if (labelsRef) {
          labelsRef.current = [];
        }
      };
    },
    () => [props.elementsRef, props.labelsRef],
  );

  useIsoLayoutEffect(
    () => {
      if (isDirty) {
        flush();
      }
    },
    () => [mapTick()],
  );

  onCleanup(() => {
    mutationObserver?.disconnect();
  });

  function subscribeMapChange(fn: Function) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  const contextValue = { register, unregister, update, subscribeMapChange, nextIndexRef };

  return <CompositeListContext value={contextValue}>{props.children}</CompositeListContext>;
}

function createMap<Metadata>() {
  return new Map<Element, CompositeListRegistration<Metadata>>();
}

function createListeners() {
  return new Set<Function>();
}

function getCompositeListSnapshot<Metadata>(
  map: Map<Element, CompositeListRegistration<Metadata>>,
) {
  const reservedIndices = new Set<number>();
  const items: CompositeListItem<Metadata>[] = [];
  const automaticItems: CompositeListItem<Metadata>[] = [];

  map.forEach((registration, node) => {
    if (!node.isConnected) {
      return;
    }

    const index = registration.index;
    const item = {
      index: index ?? -1,
      element: node as HTMLElement,
      registration,
    };

    if (index === null) {
      automaticItems.push(item);
    } else if (index >= 0) {
      reservedIndices.add(index);
      items.push(item);
    }
  });

  let nextAutomaticIndex = 0;
  automaticItems.sort((a, b) => sortByDocumentPosition(a.element, b.element));

  automaticItems.forEach((item) => {
    while (reservedIndices.has(nextAutomaticIndex)) {
      nextAutomaticIndex += 1;
    }

    item.index = nextAutomaticIndex;
    items.push(item);
    nextAutomaticIndex += 1;
  });

  if (reservedIndices.size > 0) {
    items.sort((a, b) => a.index - b.index);
  }

  return [items, automaticItems.map((item) => item.element)] as const;
}

function getCommonAncestor(firstNode: Element, lastNode: Element) {
  let ancestor = firstNode.parentElement;

  // The `parentElement` walk cannot cross shadow boundaries, so the native
  // `contains` is sufficient here.
  while (ancestor && !ancestor.contains(lastNode)) {
    ancestor = ancestor.parentElement;
  }

  return ancestor;
}

function hasMovedNode(entries: MutationRecord[]) {
  for (const entry of entries) {
    for (let i = 0; i < entry.removedNodes.length; i += 1) {
      if (entry.removedNodes[i].isConnected) {
        return true;
      }
    }
  }

  return false;
}

function sortByDocumentPosition(a: Element, b: Element) {
  // Adjacent siblings are the common case for lists that are already in order, and
  // `compareDocumentPosition` scans siblings from the parent's first child, so sorting
  // a long flat list would otherwise be quadratic.
  if (a.nextElementSibling === b) {
    return -1;
  }
  if (b.nextElementSibling === a) {
    return 1;
  }
  // `DOCUMENT_POSITION_CONTAINED_BY` is always reported alongside `FOLLOWING`, and `CONTAINS`
  // alongside `PRECEDING`, so testing `FOLLOWING` alone orders siblings and nested items alike.
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

export interface CompositeListState {}

export interface CompositeListProps<Metadata> {
  children: JSX.Element;
  /**
   * A ref to the list of HTML elements, ordered by their index.
   * Explicit indexes can leave empty slots in the array.
   * `useListNavigation`'s `listRef` prop.
   */
  elementsRef: RefObject<Array<HTMLElement | null>>;
  /**
   * A ref to the list of element labels, ordered by their index.
   * `useTypeahead`'s `listRef` prop.
   */
  labelsRef?: RefObject<Array<string | null>> | undefined;
  onMapChange?: ((newMap: Map<Element, CompositeMetadata<Metadata>>) => void) | undefined;
}

export namespace CompositeList {
  export type State = CompositeListState;
  export type Props<Metadata> = CompositeListProps<Metadata>;
}
