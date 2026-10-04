import { createMemo, omit, Show, untrack } from 'solid-js';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { FloatingNode } from '../../floating-ui-react';
import { MenuPositionerContext } from './MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { MenuRoot } from '../root/MenuRoot';
import { useAnchorPositioning } from '../../internals/useAnchorPositioning';
import type {
  Align,
  Side,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { useMenuPortalContext } from '../portal/MenuPortalContext';
import { DROPDOWN_COLLISION_AVOIDANCE, POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { MenuOpenEventDetails } from '../utils/types';
import { useTriggerSwitchTransition } from '../../internals/useTriggerSwitchTransition';
import { usePositioner } from '../../utils/usePositioner';
import { useAnchoredPopupScrollLock } from '../../utils/useAnchoredPopupScrollLock';

/**
 * Positions the menu popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPositioner(componentProps: MenuPositioner.Props) {
  const elementProps = omit(
    componentProps,
    'anchor',
    'positionMethod',
    'class',
    'render',
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionBoundary',
    'collisionPadding',
    'arrowPadding',
    'sticky',
    'disableAnchorTracking',
    'collisionAvoidance',
    'style',
  );

  const { store, virtualFocus, syncHighlightedItem } = useMenuRootContext();
  const keepMounted = useMenuPortalContext();
  const contextMenuContext = useContextMenuRootContext(true);

  const parent = store.useState('parent');
  const floatingRootContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const triggerElement = store.useState('activeTriggerElement');
  const transitionStatus = store.useState('transitionStatus');
  const positionerElement = store.useState('positionerElement');
  const instantType = store.useState('instantType');
  const adaptiveOrigin = store.useState('adaptiveOrigin');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const floatingNodeId = store.useState('floatingNodeId');
  const floatingParentNodeId = store.useState('floatingParentNodeId');
  const domReference = untrack(floatingRootContext).useState('domReferenceElement');

  // Port note: upstream computes these during render.
  const positioning = createMemo(() => {
    const parentValue = parent();
    let anchor = componentProps.anchor;
    let sideOffset = componentProps.sideOffset ?? 0;
    let alignOffset = componentProps.alignOffset ?? 0;
    let align = componentProps.align;
    let collisionAvoidance = componentProps.collisionAvoidance ?? DROPDOWN_COLLISION_AVOIDANCE;
    if (parentValue.type === 'context-menu') {
      anchor = componentProps.anchor ?? parentValue.context?.anchor;
      align = align ?? 'start';
      if (!componentProps.side && align !== 'center') {
        alignOffset = componentProps.alignOffset ?? 2;
        sideOffset = componentProps.sideOffset ?? -5;
      }
    }

    let computedSide = componentProps.side;
    let computedAlign = align;
    if (parentValue.type === 'menu') {
      computedSide = computedSide ?? 'inline-end';
      computedAlign = computedAlign ?? 'start';
      collisionAvoidance = componentProps.collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE;
    } else if (parentValue.type === 'menubar') {
      computedSide =
        computedSide ?? (parentValue.context.orientation === 'vertical' ? 'inline-end' : 'bottom');
      computedAlign = computedAlign ?? 'start';
    }

    return {
      anchor,
      sideOffset,
      alignOffset,
      collisionAvoidance,
      side: computedSide,
      align: computedAlign,
    };
  });

  const contextMenu = () => parent().type === 'context-menu';

  const positioner = useAnchorPositioning({
    get anchor() {
      return positioning().anchor;
    },
    get floatingRootContext() {
      return floatingRootContext();
    },
    get positionMethod() {
      return contextMenuContext ? 'fixed' : (componentProps.positionMethod ?? 'absolute');
    },
    get mounted() {
      return mounted();
    },
    get side() {
      return positioning().side;
    },
    get sideOffset() {
      return positioning().sideOffset;
    },
    get align() {
      return positioning().align;
    },
    get alignOffset() {
      return positioning().alignOffset;
    },
    get arrowPadding() {
      return contextMenu() ? 0 : (componentProps.arrowPadding ?? 5);
    },
    get collisionBoundary() {
      return componentProps.collisionBoundary ?? 'clipping-ancestors';
    },
    get collisionPadding() {
      return componentProps.collisionPadding ?? 5;
    },
    get sticky() {
      return componentProps.sticky ?? false;
    },
    get nodeId() {
      return floatingNodeId();
    },
    get keepMounted() {
      return keepMounted();
    },
    get disableAnchorTracking() {
      return componentProps.disableAnchorTracking ?? false;
    },
    get collisionAvoidance() {
      return positioning().collisionAvoidance;
    },
    get shift() {
      const collisionAvoidance = positioning().collisionAvoidance;
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
    get adaptiveOrigin() {
      return adaptiveOrigin();
    },
    lazyFlip: virtualFocus ? 'placement' : false,
  });

  useEffect(
    ([floatingTreeRootValue, floatingNodeIdValue]) => {
      function onMenuOpenChange(details: MenuOpenEventDetails) {
        if (details.open) {
          if (details.parentNodeId === floatingNodeIdValue) {
            store.set('hoverEnabled', false);
          }
          if (
            details.nodeId !== floatingNodeIdValue &&
            details.parentNodeId === store.select('floatingParentNodeId')
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
    () => [floatingTreeRoot(), floatingNodeId()] as const,
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
    ([floatingTreeRootValue, openValue, floatingNodeIdValue, floatingParentNodeIdValue]) => {
      const eventDetails: MenuOpenEventDetails = {
        open: openValue,
        nodeId: floatingNodeIdValue,
        parentNodeId: floatingParentNodeIdValue,
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

  const state = createMemo<MenuPositionerState>(() => ({
    open: open(),
    side: positioner.side,
    align: positioner.align,
    anchorHidden: positioner.anchorHidden,
    nested: parent().type === 'menu',
    instant: instantType(),
  }));

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
          onMapChange={syncHighlightedItem}
        >
          {/* Port note: rendered here so the children are created under the providers. */}
          {usePositioner(componentProps, state, {
            get styles() {
              return positioner.positionerStyles;
            },
            get transitionStatus() {
              return transitionStatus();
            },
            props: elementProps as HTMLProps<HTMLDivElement>,
            refs: [store.useStateSetter('positionerElement')],
            get hidden() {
              return !mounted();
            },
            get inert() {
              return !open();
            },
          })}
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
