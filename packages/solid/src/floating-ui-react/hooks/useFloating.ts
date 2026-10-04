import { createSignal, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { isElement } from '@floating-ui/utils/dom';
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
 * Port note: `options` is read lazily (pass getters for reactive options); `rootContext`,
 * `nodeId` and `externalTree` are read once. The returned object and its `context` expose the
 * positioning data through getters (see `UseFloatingReturn` in `../dom`).
 */
export function useBaseUIFloating(
  options: UseFloatingOptions & { rootContext: FloatingRootStore },
): UseFloatingReturn {
  const {
    nodeId,
    externalTree,
    rootContext: store,
  } = untrack(() => ({
    nodeId: options.nodeId,
    externalTree: options.externalTree,
    rootContext: options.rootContext,
  }));

  const referenceElement = store.useState('referenceElement');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');
  const open = store.useState('open');
  const floatingId = store.useState('floatingId');

  const [positionReference, setPositionReferenceRaw] = createSignal<ReferenceType | null>(null, {
    ownedWrite: true,
  });

  const domReferenceRef: { current: NarrowedElement<ReferenceType> | null } = { current: null };

  const tree = useFloatingTree(externalTree);

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
    dataRef: store.context.dataRef,
    get open() {
      return open();
    },
    onOpenChange: store.setOpen,
    events: store.context.events,
    get floatingId() {
      return floatingId();
    },
    refs,
    elements,
    nodeId,
    rootStore: store,
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
  // a single object here, so it's assigned once.
  store.context.dataRef.current.floatingContext = context;
  useIsoLayoutEffect(
    ([treeValue]) => {
      store.context.dataRef.current.floatingContext = context;

      const node = treeValue?.nodesRef.current.find((n) => n.id === nodeId);
      if (node) {
        node.context = context;
      }
    },
    () => [tree],
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
    rootStore: store as unknown as FloatingRootStore,
  } as UseFloatingReturn;
}
