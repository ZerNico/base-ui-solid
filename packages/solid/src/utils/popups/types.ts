// Port note: `@floating-ui/react-dom` is replaced by the Solid counterpart in `./positioning/dom`.
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type {
  UseFloatingOptions as UsePositionOptions,
  UseFloatingReturn as UsePositionFloatingReturn,
  VirtualElement,
} from './positioning/dom';
import type { HTMLProps } from '../../internals/types';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';

import type { FloatingTreeStore } from './tree/FloatingTreeStore';
import type { FloatingRootStore } from './floating-root/FloatingRootStore';

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Delay = number | Partial<{ open: number; close: number }>;

export type NarrowedElement<T> = T extends Element ? T : Element;

export interface ExtendedRefs {
  reference: RefObject<ReferenceType | null>;
  floating: RefObject<HTMLElement | null>;
  domReference: RefObject<NarrowedElement<ReferenceType> | null>;
  setReference(node: ReferenceType | null): void;
  setFloating(node: HTMLElement | null): void;
  setPositionReference(node: ReferenceType | null): void;
}

export interface ExtendedElements {
  reference: ReferenceType | null;
  floating: HTMLElement | null;
  domReference: NarrowedElement<ReferenceType> | null;
}

export interface FloatingEvents {
  emit<T extends string>(event: T, data?: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
}

export interface ContextData {
  openEvent?: Event | undefined;
  floatingContext?: FloatingContext | undefined;
  [key: string]: any;
}

export type FloatingRootContext = FloatingRootStore;

/**
 * Port note: like `UseFloatingReturn`, the positioning data, `open` and `floatingId` are getters.
 */
export type FloatingContext = Omit<
  UsePositionFloatingReturn<ReferenceType>,
  'refs' | 'elements'
> & {
  open: boolean;
  onOpenChange(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  events: FloatingEvents;
  dataRef: RefObject<ContextData>;
  nodeId: string | undefined;
  floatingId: string | undefined;
  refs: ExtendedRefs;
  elements: ExtendedElements;
  rootStore: FloatingRootContext;
};

export interface FloatingNodeType {
  id: string | undefined;
  parentId: string | null;
  context?: FloatingContext | undefined;
}

export type FloatingTreeType = FloatingTreeStore;

/**
 * Port note: interaction hooks return this object with getters: read its properties (and the
 * props objects' properties) in a reactive scope, e.g. inside `useRenderElement`'s `props`
 * accessor or `mergeProps` called there.
 */
export interface ElementProps {
  reference?: HTMLProps<Element> | undefined;
  floating?: HTMLProps<HTMLElement> | undefined;
  item?: HTMLProps<HTMLElement> | undefined;
  trigger?: HTMLProps<Element> | undefined;
}

export type ReferenceType = Element | VirtualElement;

export type UseFloatingData = Prettify<UseFloatingReturn>;

export type UseFloatingReturn = Prettify<
  UsePositionFloatingReturn & {
    /**
     * `FloatingContext`
     */
    context: Prettify<FloatingContext>;
    /**
     * Object containing the reference and floating refs and reactive setters.
     */
    refs: ExtendedRefs;
    elements: ExtendedElements;
  }
>;

export interface UseFloatingOptions extends Omit<UsePositionOptions, 'elements'> {
  rootContext?: FloatingRootContext | undefined;
  /**
   * Port note: the element (or virtual element) to position against, derived instead of set with
   * `refs.setPositionReference` from an effect. `undefined` leaves the position reference as it
   * is.
   */
  positionReference?: ReferenceType | null | undefined;
  /**
   * Object of external elements as an alternative to the `refs` object setters.
   */
  elements?:
    | {
        /**
         * Externally passed reference element. Store in state.
         */
        reference?: ReferenceType | null | undefined;
        /**
         * Externally passed floating element. Store in state.
         */
        floating?: HTMLElement | null | undefined;
      }
    | undefined;
  /**
   * An event callback that is invoked when the floating element is opened or
   * closed.
   */
  onOpenChange?(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  /**
   * Unique node id when using `FloatingTree`.
   */
  nodeId?: string | undefined;
  /**
   * External FloatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
}
