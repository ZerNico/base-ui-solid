import { createContext, createMemo, untrack, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useId } from '@base-ui-solid/utils/useId';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { FloatingNodeType, FloatingTreeType } from '../types';
import { FloatingTreeStore } from './FloatingTreeStore';

/**
 * Port note: the node context value holds getters (`id`, `parentId`) so that it stays the same
 * object while the ids change.
 */
const FloatingNodeContext = createContext<FloatingNodeType | null>(null);
const FloatingTreeContext = createContext<FloatingTreeType | null>(null);

/**
 * Returns the parent node id for nested floating elements, if available.
 * Returns `null` for top-level floating elements.
 *
 * Port note: reads the id once. Floating node ids are generated once per component, so they don't
 * change in practice.
 */
export const useFloatingParentNodeId = (): string | null => {
  const node = useContext(FloatingNodeContext);
  // Port note: `untrack` marks the one-time read of the `id` getter as intentional (Solid's
  // `STRICT_READ_UNTRACKED` diagnostic).
  return untrack(() => node?.id) || null;
};

// Port note: detached triggers can replace a popup node ID after descendants mount.
// React reads context again on rerender; Solid consumers keep a live accessor instead.
export function useFloatingParentNodeIdAccessor(): Accessor<string | null> {
  const node = useContext(FloatingNodeContext);
  return () => node?.id || null;
}

/**
 * Returns the nearest floating tree context, if available.
 */
export const useFloatingTree = (externalTree?: FloatingTreeStore): FloatingTreeType | null => {
  const contextTree = useContext(FloatingTreeContext) as FloatingTreeType | null;
  return externalTree ?? contextTree;
};

/**
 * Registers a node into the `FloatingTree`, returning its id.
 * @see https://floating-ui.com/docs/FloatingTree
 */
export function useFloatingNodeId(
  externalTree?: FloatingTreeStore | Accessor<FloatingTreeStore | undefined>,
): string | undefined {
  const id = useId();
  // Port note: `externalTree` may be an accessor (e.g. a tree read from a popup store), in which
  // case the node moves to the new tree when it changes, like upstream on re-render.
  const contextTree = useFloatingTree();
  const tree = () =>
    (typeof externalTree === 'function' ? externalTree() : externalTree) ?? contextTree;
  const parentId = useFloatingParentNodeIdAccessor();

  useIsoLayoutEffect(
    ([treeValue, parentIdValue]) => {
      if (!id) {
        return undefined;
      }

      const node = { id, parentId: parentIdValue };
      treeValue?.addNode(node);
      return () => {
        treeValue?.removeNode(node);
      };
    },
    () => [tree(), parentId(), id],
  );

  return id;
}

export interface FloatingNodeProps {
  children?: JSX.Element | undefined;
  id: string | undefined;
}

/**
 * Provides parent node context for nested floating elements.
 * @see https://floating-ui.com/docs/FloatingTree
 * @internal
 */
export function FloatingNode(props: FloatingNodeProps): JSX.Element {
  const parentId = useFloatingParentNodeIdAccessor();
  const id = createMemo(() => props.id);

  const value: FloatingNodeType = {
    get id() {
      return id();
    },
    get parentId() {
      return parentId();
    },
  };

  return <FloatingNodeContext value={value}>{props.children}</FloatingNodeContext>;
}

export interface FloatingTreeProps {
  children?: JSX.Element | undefined;
  externalTree?: FloatingTreeStore | undefined;
}

/**
 * Provides context for nested floating elements when they are not children of
 * each other on the DOM.
 * This is not necessary in all cases, except when there must be explicit communication between parent and child floating elements. It is necessary for:
 * - The `bubbles` option in the `useDismiss()` Hook
 * - Nested virtual list navigation
 * - Nested floating elements that each open on hover
 * - Custom communication between parent and child floating elements
 * @see https://floating-ui.com/docs/FloatingTree
 * @internal
 */
export function FloatingTree(props: FloatingTreeProps): JSX.Element {
  // Port note: the tree is created once, like upstream's `useRefWithInit`.
  const tree = untrack(() => props.externalTree) ?? new FloatingTreeStore();
  return <FloatingTreeContext value={tree}>{props.children}</FloatingTreeContext>;
}
