import { createContext, useContext } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';

export interface CompositeListRegistration<Metadata> {
  metadata: Metadata | null;
  index: number | null;
  label: string | null | undefined;
  textRef: RefObject<HTMLElement | null> | undefined;
}

export interface CompositeListContextValue<Metadata> {
  register: (node: Element, registration: CompositeListRegistration<Metadata>) => void;
  unregister: (node: Element) => void;
  /**
   * Port note: upstream re-registers an item by recreating its callback ref, so React reattaches
   * every ref on the element in order and the outermost item keeps ownership of a shared node.
   * Solid calls refs once, so items republish changed registration data through `update`, which
   * only replaces the entry when the item still owns it (or the node isn't registered).
   */
  update: (
    node: Element,
    previous: CompositeListRegistration<Metadata>,
    next: CompositeListRegistration<Metadata>,
  ) => void;
  subscribeMapChange: (fn: (map: Map<Element, Metadata>) => void) => () => void;
  nextIndexRef: RefObject<number>;
}

export const CompositeListContext = createContext<CompositeListContextValue<any>>({
  register: () => {},
  unregister: () => {},
  update: () => {},
  subscribeMapChange: () => () => {},
  nextIndexRef: { current: 0 },
});

export function useCompositeListContext() {
  return useContext(CompositeListContext);
}
