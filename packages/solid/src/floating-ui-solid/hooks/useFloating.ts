import { createMemo, createSignal, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { isElement } from '@floating-ui/utils/dom';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useFloating as usePosition } from '../dom';
import type { VirtualElement } from '../dom';
import type { FloatingRootStore } from '../components/FloatingRootStore';
import { useFloatingTree } from '../components/FloatingTree';
import type {
  FloatingContext,
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
 * `nodeId`, `externalTree`, and `rootContext` are read reactively: like upstream re-rendering with
 * another store, a new store is subscribed to (Navigation Menu's positioner switches to the active
 * trigger's store). The returned object and its `context` expose the positioning data (and the
 * store-dependent fields) through getters (see `UseFloatingReturn` in `../dom`).
 */
export function useBaseUIFloating(
  options: UseFloatingOptions & { rootContext: FloatingRootStore },
): UseFloatingReturn {
  // Port note: detached triggers can replace the node and tree after the popup mounts.
  const nodeId = () => options.nodeId;

  const store = createMemo(() => options.rootContext);
  // The subscriptions are owned by the memo, so they're disposed when the store changes.
  const storeState = createMemo(
    () => {
      const currentStore = store();
      return {
        referenceElement: currentStore.useState('referenceElement'),
        floatingElement: currentStore.useState('floatingElement'),
        domReferenceElement: currentStore.useState('domReferenceElement'),
        open: currentStore.useState('open'),
        floatingId: currentStore.useState('floatingId'),
      };
    },
    { equals: fastObjectShallowCompare },
  );

  const referenceElement = () => storeState().referenceElement();
  const floatingElement = () => storeState().floatingElement();
  const domReferenceElement = () => storeState().domReferenceElement();
  const open = () => storeState().open();
  const floatingId = () => storeState().floatingId();

  const [positionReference, setPositionReferenceRaw] = createSignal<ReferenceType | null>(null, {
    ownedWrite: true,
  });

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
        return positionReference() || referenceElement();
      },
      get floating() {
        return floatingElement();
      },
    },
  });

  const setPositionReference = (node: ReferenceType | null) => {
    const computedPositionReference = isElement(node)
      ? ({
          getBoundingClientRect: () => node.getBoundingClientRect(),
          getClientRects: () => node.getClientRects(),
          contextElement: node,
        } satisfies VirtualElement)
      : node;
    // Store the positionReference in state if the DOM reference is specified externally via the
    // `elements.reference` option. This ensures that it won't be overridden on future renders.
    setPositionReferenceRaw(() => computedPositionReference);
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
      return domReferenceElement() as NarrowedElement<ReferenceType> | null;
    },
  };

  const context: FloatingContext = {
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
    get dataRef() {
      return store().context.dataRef;
    },
    get open() {
      return open();
    },
    get onOpenChange() {
      return store().setOpen;
    },
    get events() {
      return store().context.events;
    },
    get floatingId() {
      return floatingId();
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
    () => [domReferenceElement()],
  );

  // Port note: upstream re-assigns the (new) context object after every render. The context is
  // a single object here, so it's assigned once per store.
  untrack(store).context.dataRef.current.floatingContext = context;
  useIsoLayoutEffect(
    ([treeValue, currentStore, nodeIdValue]) => {
      currentStore.context.dataRef.current.floatingContext = context;

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
      return store() as unknown as FloatingRootStore;
    },
  } as UseFloatingReturn;
}
