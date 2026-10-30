import { createMemo, createSignal, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { isElement } from '@floating-ui/utils/dom';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useFloating as usePosition } from './dom';
import type { VirtualElement } from './dom';
import { useFloatingTree } from '../tree/FloatingTree';
import type {
  PopupPositioningContext,
  PopupInteractionStore,
  NarrowedElement,
  ReferenceType,
  UseFloatingOptions,
  UseFloatingReturn,
} from '../types';

/**
 * Provides data to position a floating element and context to add interactions.
 * The caller supplies the root store, which owns the reference and floating elements.
 * @see https://floating-ui.com/docs/useFloating
 *
 * Port note: `options` is read lazily (pass getters for reactive options).
 * `nodeId`, `externalTree`, and `rootStore` are read reactively: like upstream re-rendering with
 * another store, a new store is subscribed to (Navigation Menu's positioner switches to the active
 * trigger's store). The returned object and its `context` expose the positioning data (and the
 * store-dependent fields) through getters (see `UseFloatingReturn` in `../dom`).
 */
export function useBaseUIFloating(
  options: UseFloatingOptions & { rootStore: PopupInteractionStore },
): UseFloatingReturn {
  // Port note: detached triggers can replace the node and tree after the popup mounts.
  const nodeId = () => options.nodeId;

  const store = createMemo(() => options.rootStore);
  // The subscriptions are owned by the memo, so they're disposed when the store changes.
  const storeState = createMemo(
    () => {
      const currentStore = store();
      return {
        anchor: currentStore.useState('anchor'),
        positionerElement: currentStore.useState('positionerElement'),
        anchorElement: currentStore.useState('anchorElement'),
        open: currentStore.useState('open'),
        defaultPopupId: currentStore.useState('defaultPopupId'),
      };
    },
    { equals: fastObjectShallowCompare },
  );

  const anchor = () => storeState().anchor();
  const positionerElement = () => storeState().positionerElement();
  const anchorElement = () => storeState().anchorElement();
  const open = () => storeState().open();
  const defaultPopupId = () => storeState().defaultPopupId();

  // Port note: `options.positionerAnchor` derives the Positioner's anchor (`undefined` leaves it
  // as it is), instead of an effect calling `refs.setPositionReference`. A call still sets it,
  // until the option changes.
  const [positionerAnchor, setPositionerAnchor] = createSignal<ReferenceType | null>(
    (previous) => {
      const node = options.positionerAnchor;
      if (node === undefined) {
        return previous ?? null;
      }
      return toPositionReference(node, previous ?? null);
    },
    { ownedWrite: true },
  );

  const domReferenceRef: { current: NarrowedElement<ReferenceType> | null } = { current: null };

  const contextTree = useFloatingTree();
  const tree = () => options.externalTree ?? contextTree;

  const position = usePosition({
    get placement() {
      return options.placement;
    },
    get strategy() {
      return options.strategy;
    },
    get middleware() {
      return options.middleware;
    },
    get platform() {
      return options.platform;
    },
    get whileElementsMounted() {
      return options.whileElementsMounted;
    },
    get open() {
      return options.open;
    },
    get transform() {
      return options.transform;
    },
    elements: {
      get reference() {
        return positionerAnchor() || anchor();
      },
      get floating() {
        return positionerElement();
      },
    },
  });

  const setPositionReference = (node: ReferenceType | null) => {
    const computedPositionReference = toPositionReference(node, null);
    // Keep the Positioner's anchor in state when the store also has an anchor, so the store's
    // doesn't replace it on future renders.
    setPositionerAnchor(() => computedPositionReference);
    position.refs.setReference(computedPositionReference);
  };

  const refs = {
    ...position.refs,
    setPositionReference,
    domReference: domReferenceRef,
  };

  const elements = {
    get reference() {
      return position.elements.reference;
    },
    get floating() {
      return position.elements.floating;
    },
    get domReference() {
      return anchorElement() as NarrowedElement<ReferenceType> | null;
    },
  };

  const context: PopupPositioningContext = {
    get x() {
      return position.x;
    },
    get y() {
      return position.y;
    },
    get strategy() {
      return position.strategy;
    },
    get placement() {
      return position.placement;
    },
    get middlewareData() {
      return position.middlewareData;
    },
    get isPositioned() {
      return position.isPositioned;
    },
    get floatingStyles() {
      return position.floatingStyles;
    },
    update: position.update,
    get open() {
      return open();
    },
    get defaultPopupId() {
      return defaultPopupId();
    },
    refs,
    elements,
    get nodeId() {
      return nodeId();
    },
    get rootStore() {
      return store();
    },
  };

  useIsoLayoutEffect(
    ([domReference]) => {
      if (domReference) {
        domReferenceRef.current = domReference as NarrowedElement<ReferenceType> | null;
      }
    },
    () => [anchorElement()],
  );

  // Port note: upstream re-assigns the (new) context object after every render. The context is
  // a single object here, so it's assigned once per store.
  untrack(store).context.positioning = context;
  useIsoLayoutEffect(
    ([treeValue, currentStore, nodeIdValue]) => {
      currentStore.context.positioning = context;

      const node = treeValue?.nodesRef.current.find((n) => n.id === nodeIdValue);
      if (node) {
        node.context = context;
      }
    },
    () => [tree(), store(), nodeId()] as const,
  );

  return {
    get x() {
      return position.x;
    },
    get y() {
      return position.y;
    },
    get strategy() {
      return position.strategy;
    },
    get placement() {
      return position.placement;
    },
    get middlewareData() {
      return position.middlewareData;
    },
    get isPositioned() {
      return position.isPositioned;
    },
    get floatingStyles() {
      return position.floatingStyles;
    },
    update: position.update,
    context,
    refs,
    elements,
    get rootStore() {
      return store();
    },
  } as UseFloatingReturn;
}

/**
 * Wraps an element in a virtual element positioned by it (keeping `previous` when it already
 * wraps the same element).
 */
function toPositionReference(
  node: ReferenceType | null,
  previous: ReferenceType | null,
): ReferenceType | null {
  if (!isElement(node)) {
    return node;
  }
  if (previous && (previous as VirtualElement).contextElement === node) {
    return previous;
  }
  return {
    getBoundingClientRect: () => node.getBoundingClientRect(),
    getClientRects: () => node.getClientRects(),
    contextElement: node,
  } satisfies VirtualElement;
}
