import { createMemo, Show, untrack } from 'solid-js';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { FloatingNode } from '../../utils/popups/tree/FloatingTree';
import { MenuPositionerContext } from './MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { MenuRoot } from '../root/MenuRoot';
import type {
  Align,
  Side,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import { InternalBackdrop } from '../../utils/popups/InternalBackdrop';
import { useMenuPortalContext } from '../portal/MenuPortalContext';
import { DROPDOWN_COLLISION_AVOIDANCE, POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { MenuOpenEventDetails } from '../utils/types';
import { useTriggerSwitchTransition } from '../../internals/useTriggerSwitchTransition';
import { usePopupPositioner } from '../../utils/popups/popupPositioner';
import { useAnchoredPopupScrollLock } from '../../utils/popups/useAnchoredPopupScrollLock';

/**
 * Positions the menu popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuPositioner(componentProps: MenuPositioner.Props) {
  const { store, virtualFocus, onItemsChange } = useMenuRootContext();
  const keepMounted = useMenuPortalContext();
  const contextMenuContext = useContextMenuRootContext(true);

  const parent = store.useState('parent');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const triggerElement = store.useState('activeTriggerElement');
  const positionerElement = store.useState('positionerElement');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const floatingNodeId = store.useState('floatingNodeId');
  const floatingParentNodeId = store.useState('floatingParentNodeId');
  const domReference = store.useState('anchorElement');

  // Port note: upstream computes these during render.
  const positioningValues = createMemo(
    () => {
      const parentValue = parent();
      const side = componentProps.side;
      let anchor = componentProps.anchor;
      let sideOffset = componentProps.sideOffset;
      let alignOffset = componentProps.alignOffset;
      let align = componentProps.align;
      if (parentValue.type === 'context-menu') {
        anchor = anchor ?? parentValue.context?.anchor;
        align = align ?? 'start';
        if (!side && align !== 'center') {
          alignOffset = componentProps.alignOffset ?? 2;
          sideOffset = componentProps.sideOffset ?? -5;
        }
      }

      let computedSide = side;
      let computedAlign = align;
      if (parentValue.type === 'menu') {
        computedSide = computedSide ?? 'inline-end';
        computedAlign = computedAlign ?? 'start';
      } else if (parentValue.type === 'menubar') {
        computedSide =
          computedSide ??
          (parentValue.context.orientation === 'vertical' ? 'inline-end' : 'bottom');
        computedAlign = computedAlign ?? 'start';
      }

      const defaultCollisionAvoidance =
        parentValue.type === 'menu' ? POPUP_COLLISION_AVOIDANCE : DROPDOWN_COLLISION_AVOIDANCE;
      const collisionAvoidance = componentProps.collisionAvoidance ?? defaultCollisionAvoidance;

      return {
        anchor,
        sideOffset,
        alignOffset,
        collisionAvoidance,
        side: computedSide,
        align: computedAlign,
      };
    },
    { equals: fastObjectShallowCompare },
  );

  const contextMenu = () => parent().type === 'context-menu';

  const {
    element,
    positioning: positioner,
    open,
    mounted,
  } = usePopupPositioner(store, componentProps, {
    keepMounted,
    positioning: {
      get anchor() {
        return positioningValues().anchor;
      },
      get collisionAvoidance() {
        return positioningValues().collisionAvoidance;
      },
      get positionMethod() {
        return contextMenuContext ? 'fixed' : componentProps.positionMethod;
      },
      get side() {
        return positioningValues().side;
      },
      get sideOffset() {
        return positioningValues().sideOffset;
      },
      get align() {
        return positioningValues().align;
      },
      get alignOffset() {
        return positioningValues().alignOffset;
      },
      get arrowPadding() {
        return contextMenu() ? 0 : componentProps.arrowPadding;
      },
      get nodeId() {
        return floatingNodeId();
      },
      get shift() {
        const collisionAvoidance = positioningValues().collisionAvoidance;
        return contextMenu()
          ? {
              crossAxis: !('side' in collisionAvoidance && collisionAvoidance.side === 'flip'),
              rootBoundary: 'layoutViewport' as const,
            }
          : undefined;
      },
      get externalTree() {
        return floatingTreeRoot();
      },
      lazyFlip: virtualFocus ? 'placement' : false,
    },
    state: () => ({ nested: parent().type === 'menu' }),
  });

  useEffect(
    ([floatingTreeRootValue]) => {
      function onMenuOpenChange(details: MenuOpenEventDetails) {
        // Port note: read the node id when the event arrives. It's derived from the trigger that
        // opens the menu, so it changes in the same update as the open state, possibly before
        // this listener would have been re-subscribed with it.
        const floatingNodeIdValue = store.select('floatingNodeId');
        if (details.open) {
          if (details.parentNodeId === floatingNodeIdValue) {
            store.set('hoverEnabled', false);
          }
          // A submenu that is already closed has nothing to close, and a dropped close would cancel
          // a hover open it has pending. This mirrors the drop rule in `setOpen`.
          if (
            details.nodeId !== floatingNodeIdValue &&
            details.parentNodeId === store.select('floatingParentNodeId') &&
            (store.state.open || store.state.openProp)
          ) {
            store.setOpen(false, createChangeEventDetails(REASONS.siblingOpen));
          }
        }
      }

      floatingTreeRootValue.events.on('menuopenchange', onMenuOpenChange);

      return () => {
        floatingTreeRootValue.events.off('menuopenchange', onMenuOpenChange);
      };
    },
    () => [floatingTreeRoot()] as const,
  );

  useEffect(
    ([floatingTreeRootValue]) => {
      if (store.select('floatingParentNodeId') == null) {
        return undefined;
      }

      function onParentClose(details: MenuOpenEventDetails) {
        if (details.open || details.nodeId !== store.select('floatingParentNodeId')) {
          return;
        }

        const reason: MenuRoot.ChangeEventReason = details.reason ?? REASONS.siblingOpen;
        store.setOpen(false, createChangeEventDetails(reason));
      }

      floatingTreeRootValue.events.on('menuopenchange', onParentClose);

      return () => {
        floatingTreeRootValue.events.off('menuopenchange', onParentClose);
      };
    },
    () => [floatingTreeRoot()] as const,
  );

  const closeTimeout = useTimeout();

  // Clear pending close timeout when the menu closes.
  useEffect(
    ([openValue]) => {
      if (!openValue) {
        closeTimeout.clear();
      }
    },
    () => [open()] as const,
  );

  // Close unrelated child submenus when hovering a different item in the parent menu.
  useEffect(
    ([floatingTreeRootValue, openValue, triggerElementValue]) => {
      function onItemHover(event: { nodeId: string | undefined; target: Element | null }) {
        // If an item within our parent menu is hovered, and this menu's trigger is not that item,
        // close this submenu. This ensures hovering a different item in the parent closes other branches.
        if (!openValue || event.nodeId !== store.select('floatingParentNodeId')) {
          return;
        }

        if (event.target && triggerElementValue && triggerElementValue !== event.target) {
          const delay = store.select('closeDelay');
          if (delay > 0) {
            if (!closeTimeout.isStarted()) {
              closeTimeout.start(delay, () => {
                store.setOpen(false, createChangeEventDetails(REASONS.siblingOpen));
              });
            }
          } else {
            store.setOpen(false, createChangeEventDetails(REASONS.siblingOpen));
          }
        } else {
          // User re-hovered the submenu trigger, cancel pending close.
          closeTimeout.clear();
        }
      }

      floatingTreeRootValue.events.on('itemhover', onItemHover);
      return () => {
        floatingTreeRootValue.events.off('itemhover', onItemHover);
      };
    },
    () => [floatingTreeRoot(), open(), triggerElement()] as const,
  );

  useEffect(
    ([floatingTreeRootValue, openValue]) => {
      // Port note: the tree ids are read when the event is emitted, like the listener above does, so
      // both sides agree while a trigger takes over the menu's node in the same update.
      const eventDetails: MenuOpenEventDetails = {
        open: openValue,
        nodeId: store.select('floatingNodeId'),
        parentNodeId: store.select('floatingParentNodeId'),
        reason: store.select('lastOpenChangeReason'),
      };

      floatingTreeRootValue.events.emit('menuopenchange', eventDetails);
    },
    () => [floatingTreeRoot(), open(), floatingNodeId(), floatingParentNodeId()] as const,
  );

  useTriggerSwitchTransition({
    store,
    domReference,
    positionerElement,
    open,
  });

  const menubarModal = () => {
    const parentValue = parent();
    return parentValue.type === 'menubar' && parentValue.context.modal;
  };
  const popupModal = () => modal() && lastOpenChangeReason() !== REASONS.triggerHover;

  useAnchoredPopupScrollLock(
    () => open() && (menubarModal() || popupModal()),
    () => openMethod() === 'touch',
    positionerElement,
    triggerElement,
  );

  const shouldRenderBackdrop = () => {
    const parentValue = parent();
    return (
      mounted() &&
      parentValue.type !== 'menu' &&
      ((parentValue.type !== 'menubar' &&
        modal() &&
        lastOpenChangeReason() !== REASONS.triggerHover) ||
        (parentValue.type === 'menubar' && parentValue.context.modal))
    );
  };

  // cuts a hole in the backdrop to allow pointer interaction with the menubar or dropdown menu trigger element
  const backdropCutout = (): HTMLElement | null => {
    const parentValue = parent();
    if (parentValue.type === 'menubar') {
      return parentValue.context.contentElement;
    }
    if (parentValue.type === undefined) {
      return triggerElement() as HTMLElement | null;
    }
    return null;
  };

  return (
    <MenuPositionerContext value={positioner}>
      <Show when={shouldRenderBackdrop()}>
        <InternalBackdrop
          ref={(element) => {
            // Port note: a ref callback in place of upstream's ref object.
            const parentValue = untrack(parent);
            if (parentValue.type === 'context-menu' || parentValue.type === 'nested-context-menu') {
              parentValue.context.internalBackdropRef.current = element;
            }
          }}
          inert={inertValue(!open())}
          cutout={backdropCutout()}
        />
      </Show>
      <FloatingNode id={floatingNodeId()}>
        <CompositeList
          elementsRef={store.context.itemDomElements}
          labelsRef={store.context.itemLabels}
          onMapChange={onItemsChange}
        >
          {/* Port note: rendered here so the children are created under the providers. */}
          {element()}
        </CompositeList>
      </FloatingNode>
    </MenuPositionerContext>
  );
}

export interface MenuPositionerState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
  /**
   * Whether the component is nested.
   */
  nested: boolean;
  /**
   * Whether CSS transitions should be disabled.
   */
  instant: string | undefined;
}

export interface MenuPositionerProps
  extends
    Omit<UseAnchorPositioningSharedParameters, 'side' | 'align'>,
    BaseUIComponentProps<'div', MenuPositionerState> {
  /**
   * How to align the popup relative to the specified side.
   *
   * Submenus and menubars default to `'start'`.
   * @default 'center'
   */
  align?: UseAnchorPositioningSharedParameters['align'] | undefined;
  /**
   * Which side of the anchor element to align the popup against.
   * May automatically change to avoid collisions.
   *
   * Submenus and vertical menubars default to `'inline-end'`.
   * @default 'bottom'
   */
  side?: UseAnchorPositioningSharedParameters['side'] | undefined;
}

export namespace MenuPositioner {
  export type State = MenuPositionerState;
  export type Props = MenuPositionerProps;
}
