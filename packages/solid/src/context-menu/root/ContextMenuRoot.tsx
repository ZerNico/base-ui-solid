import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useId } from '@base-ui-solid/utils/useId';
import { ContextMenuRootContext } from './ContextMenuRootContext';
import { Menu } from '../../menu';
import { MenuRootContext } from '../../menu/root/MenuRootContext';
import type { BaseUIChangeEventDetails } from '../../types';
import type { MenuRoot } from '../../menu/root/MenuRoot';
// Port note: mutable containers replace React refs.
const refObject = <T,>(current: T): RefObject<T> => ({ current });

/**
 * A component that creates a context menu activated by right clicking or long pressing.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Context Menu](https://base-ui-solid.pages.dev/solid/components/context-menu)
 */
export function ContextMenuRoot(props: ContextMenuRoot.Props) {
  const [anchor, setAnchor] = createSignal<ContextMenuRootContext['anchor']>({
    getBoundingClientRect() {
      return DOMRect.fromRect({ width: 0, height: 0, x: 0, y: 0 });
    },
  });

  const backdropRef = refObject<HTMLDivElement | null>(null);
  const internalBackdropRef = refObject<HTMLDivElement | null>(null);
  const actionsRef: ContextMenuRootContext['actionsRef'] = refObject(null);
  const positionerRef = refObject<HTMLElement | null>(null);
  const allowMouseUpTriggerRef = refObject(true);
  const initialCursorPointRef = refObject<{ x: number; y: number } | null>(null);
  const id = useId();

  // Port note: getters keep the stable context reactive.
  const contextValue: ContextMenuRootContext = {
    get anchor() {
      return anchor();
    },
    setAnchor,
    actionsRef,
    backdropRef,
    internalBackdropRef,
    positionerRef,
    allowMouseUpTriggerRef,
    initialCursorPointRef,
    get rootId() {
      return id;
    },
  };

  return (
    <ContextMenuRootContext value={contextValue}>
      <MenuRootContext value={null}>
        <Menu.Root {...props} />
      </MenuRootContext>
    </ContextMenuRootContext>
  );
}

export interface ContextMenuRootState {}

export interface ContextMenuRootProps extends Omit<
  Menu.Root.Props,
  // Context Menu has no detached-trigger support (it opens from a right-click/long-press
  // area, not a registered trigger), so these inherited props are not applicable.
  | 'handle'
  | 'triggerId'
  | 'defaultTriggerId'
  | 'modal'
  | 'openOnHover'
  | 'delay'
  | 'closeDelay'
  | 'closeParentOnEsc'
  | 'onOpenChange'
  // Context Menu opens from a pointer position rather than a registered trigger, so the
  // render-function form of `children` (which receives the active trigger's payload) is not applicable.
  | 'children'
> {
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?:
    ((open: boolean, eventDetails: ContextMenuRoot.ChangeEventDetails) => void) | undefined;
  /**
   * @ignore
   * @deprecated This prop has no effect on Context Menu.
   */
  closeParentOnEsc?: Menu.Root.Props['closeParentOnEsc'] | undefined;
  children?: JSX.Element | undefined;
}

/**
 * The item `highlightItem` moves the highlight to.
 * - `'next'` and `'previous'` move relative to the current highlight, or enter the list from
 *   the matching end when nothing is highlighted. They wrap around unless `loopFocus` is
 *   disabled and never leave the list.
 * - `'first'` and `'last'` jump to either end of the list.
 * - `'none'` clears the highlight and hands focus back to the popup.
 */
export type ContextMenuRootHighlightItemTarget = MenuRoot.HighlightItemTarget;

export interface ContextMenuRootActions {
  unmount: () => void;
  close: () => void;
  highlightItem: (target: ContextMenuRootHighlightItemTarget) => void;
}
export type ContextMenuRootChangeEventReason = MenuRoot.ChangeEventReason;
export type ContextMenuRootChangeEventDetails =
  BaseUIChangeEventDetails<ContextMenuRoot.ChangeEventReason>;

export namespace ContextMenuRoot {
  export type State = ContextMenuRootState;
  export type Props = ContextMenuRootProps;
  export type Actions = ContextMenuRootActions;
  export type HighlightItemTarget = ContextMenuRootHighlightItemTarget;
  export type ChangeEventReason = ContextMenuRootChangeEventReason;
  export type ChangeEventDetails = ContextMenuRootChangeEventDetails;
}
