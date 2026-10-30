// Port note: `@floating-ui/react-dom` is replaced by the Solid counterpart in `./positioning/dom`.
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type {
  UseFloatingOptions as UsePositionOptions,
  UseFloatingReturn as UsePositionFloatingReturn,
  VirtualElement,
} from './positioning/dom';
import type { HTMLProps } from '../../internals/types';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';

import type { FloatingTreeStore } from './tree/FloatingTreeStore';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import type { PopupTriggerMap } from './popupTriggerMap';

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

export interface PopupEvents {
  emit<T extends string>(event: T, data?: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
}

/**
 * Reads the interaction state of a popup by key.
 */
export interface PopupInteractionReader {
  (key: 'open'): boolean;
  (key: 'transitionStatus'): TransitionStatus | undefined;
  /**
   * The active trigger's element. Popup stores keep it after the popup unmounts;
   * `FloatingRootStore` clears it while the popup isn't mounted.
   */
  (key: 'anchorElement'): Element | null;
  /**
   * The anchor the interaction hooks see: the anchor override, such as the cursor position from
   * `useClientPoint`, or else the owner's anchor (usually the active trigger). A Positioner's
   * `anchor` prop isn't included; positioning applies it on its own.
   */
  (key: 'anchor'): ReferenceType | null;
  /**
   * The popup's positioner element, or the popup itself when it has no positioner.
   */
  (key: 'positionerElement'): HTMLElement | null;
  /**
   * The popup's id unless its element sets one.
   */
  (key: 'defaultPopupId'): string | undefined;
}

/**
 * Subscribes to the interaction state of a popup by key.
 *
 * Port note: `useState` returns an accessor, so it has its own reader type.
 */
export interface PopupInteractionAccessorReader {
  (key: 'open'): Accessor<boolean>;
  (key: 'transitionStatus'): Accessor<TransitionStatus | undefined>;
  (key: 'anchorElement'): Accessor<Element | null>;
  (key: 'anchor'): Accessor<ReferenceType | null>;
  (key: 'positionerElement'): Accessor<HTMLElement | null>;
  (key: 'defaultPopupId'): Accessor<string | undefined>;
}

/**
 * Non-reactive values shared by the interaction hooks of one popup.
 * The inert stores that detached triggers use before a Root attaches freeze their context, so
 * code that can run against them only reads these fields.
 */
export interface PopupInteractionContext {
  readonly events: PopupEvents;
  nested: boolean;
  readonly triggerElements: PopupTriggerMap;
  /**
   * The event that opened the popup. Written by `dispatchOpenChange`; NavigationMenu clears it.
   */
  openEvent?: Event | undefined;
  /**
   * The popup's positioning. Written by `useFloating()`.
   */
  positioning?: PopupPositioningContext | undefined;
  /**
   * The popup's list navigation orientation, which nested lists read from their parent. Written by
   * `useListNavigation`.
   */
  orientation?: 'vertical' | 'horizontal' | 'both' | undefined;
  /**
   * Whether the current event passed through the popup's React tree, such as from a portaled
   * child, so native listeners that see it as outside ignore it. Set by `useDismiss` and the focus
   * manager, and cleared on the next tick.
   */
  insideReactTree?: boolean | undefined;
  /**
   * Whether an Escape key press bubbles to the parent popup. Written by `useDismiss` and never
   * cleared.
   */
  escapeKeyBubbles?: boolean | undefined;
  /**
   * Whether an outside press bubbles to the parent popup. Written by `useDismiss` and never
   * cleared.
   */
  outsidePressBubbles?: boolean | undefined;
}

/**
 * The store that interaction hooks, the focus manager and positioning read and write.
 * Popup stores implement it directly. Navigation Menu and Toast, which keep their open state
 * outside a store, use `FloatingRootStore`.
 */
export interface PopupInteractionStore {
  select: PopupInteractionReader;
  useState: PopupInteractionAccessorReader;
  set(key: 'anchorOverride', value: ReferenceType | null): void;
  set(key: 'anchorElement', value: Element | null): void;
  setOpen(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  readonly context: PopupInteractionContext;
}

/**
 * The store anchor positioning reads and clears. Popup stores and `FloatingRootStore` implement it;
 * the narrower handle stores that triggers use don't need to.
 */
export interface PositioningInteractionStore extends PopupInteractionStore {
  /**
   * Forgets the elements positioning reads while the popup isn't mounted, so positioning doesn't
   * run for a `keepMounted` popup that is closed.
   */
  clearPositioning(): void;
  /**
   * Port note: the derived counterpart of `clearPositioning()`, for a positioner that clears the
   * elements while `unmounted()` is true, instead of calling it from a layout effect. A write to a
   * cleared element (e.g. from `useClientPoint`) holds until `unmounted()` changes, as it would
   * after upstream's one-off clear. Call it once, under the positioner's owner.
   */
  useClearPositioning(unmounted: Accessor<boolean>): void;
}

/**
 * Port note: like `UseFloatingReturn`, the positioning data, `open` and `defaultPopupId` are
 * getters.
 */
export type PopupPositioningContext = Omit<
  UsePositionFloatingReturn<ReferenceType>,
  'refs' | 'elements'
> & {
  open: boolean;
  nodeId: string | undefined;
  defaultPopupId: string | undefined;
  refs: ExtendedRefs;
  elements: ExtendedElements;
  rootStore: PopupInteractionStore;
};

export interface FloatingNodeType {
  id: string | undefined;
  parentId: string | null;
  context?: PopupPositioningContext | undefined;
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
     * `PopupPositioningContext`
     */
    context: Prettify<PopupPositioningContext>;
    /**
     * Object containing the reference and floating refs and reactive setters.
     */
    refs: ExtendedRefs;
    elements: ExtendedElements;
  }
>;

export interface UseFloatingOptions extends Omit<UsePositionOptions, 'elements'> {
  rootStore?: PopupInteractionStore | undefined;
  /**
   * Port note: the element (or virtual element) to position against, derived instead of set with
   * `refs.setPositionReference` from an effect. `undefined` leaves it as it is.
   */
  positionerAnchor?: ReferenceType | null | undefined;
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
