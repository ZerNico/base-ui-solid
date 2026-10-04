import { createMemo, omit, Show } from 'solid-js';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { FloatingNode, useFloatingNodeId } from '../../floating-ui-react';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverPositionerContext } from './PopoverPositionerContext';
import { useAnchorPositioning } from '../../internals/useAnchorPositioning';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { usePopoverPortalContext } from '../portal/PopoverPortalContext';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { REASONS } from '../../internals/reasons';
import { POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { useTriggerSwitchTransition } from '../../internals/useTriggerSwitchTransition';
import { usePositioner } from '../../utils/usePositioner';
import { useAnchoredPopupScrollLock } from '../../utils/useAnchoredPopupScrollLock';

/**
 * Positions the popover against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPositioner(componentProps: PopoverPositioner.Props) {
  // `useAnchorPositioning` applies the same defaults to the undefined values; the names
  // remain omitted to exclude the props from `elementProps`.
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'anchor',
    'positionMethod',
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
  );

  const store = usePopoverRootContext();
  const keepMounted = usePopoverPortalContext();
  const nodeId = useFloatingNodeId();

  // Port note: the floating root context is created with the store and never replaced, so it's
  // read once.
  const floatingRootContext = store.select('floatingRootContext');
  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const openReason = store.useState('openChangeReason');
  const triggerElement = store.useState('activeTriggerElement');
  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const adaptiveOrigin = store.useState('adaptiveOrigin');

  const positioning = useAnchorPositioning({
    get anchor() {
      return componentProps.anchor;
    },
    floatingRootContext,
    get positionMethod() {
      return componentProps.positionMethod;
    },
    get mounted() {
      return mounted();
    },
    get side() {
      return componentProps.side;
    },
    get sideOffset() {
      return componentProps.sideOffset;
    },
    get align() {
      return componentProps.align;
    },
    get alignOffset() {
      return componentProps.alignOffset;
    },
    get arrowPadding() {
      return componentProps.arrowPadding;
    },
    get collisionBoundary() {
      return componentProps.collisionBoundary ?? 'clipping-ancestors';
    },
    get collisionPadding() {
      return componentProps.collisionPadding;
    },
    get sticky() {
      return componentProps.sticky;
    },
    get disableAnchorTracking() {
      return componentProps.disableAnchorTracking ?? false;
    },
    get keepMounted() {
      return keepMounted();
    },
    nodeId,
    get collisionAvoidance() {
      return componentProps.collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE;
    },
    get adaptiveOrigin() {
      return adaptiveOrigin();
    },
  });

  const domReference = floatingRootContext.useState('domReferenceElement');

  useTriggerSwitchTransition({
    store,
    domReference,
    positionerElement,
    open,
  });

  const trueModalNonHover = () => modal() === true && openReason() !== REASONS.triggerHover;

  useAnchoredPopupScrollLock(
    () => open() && trueModalNonHover(),
    () => openMethod() === 'touch',
    positionerElement,
    triggerElement,
  );

  const setPositionerElement = store.useStateSetter('positionerElement');

  const state = createMemo<PopoverPositionerState>(() => ({
    open: open(),
    side: positioning.side,
    align: positioning.align,
    anchorHidden: positioning.anchorHidden,
    instant: instantType(),
  }));

  return (
    <PopoverPositionerContext value={positioning}>
      <Show when={mounted() && trueModalNonHover()}>
        <InternalBackdrop inert={inertValue(!open())} cutout={triggerElement()} />
      </Show>
      <FloatingNode id={nodeId}>
        {usePositioner(componentProps, state, {
          get styles() {
            return positioning.positionerStyles;
          },
          get transitionStatus() {
            return transitionStatus();
          },
          // Port note: `elementProps`' handlers take `BaseUIEvent`s.
          props: elementProps as HTMLProps<HTMLDivElement>,
          refs: setPositionerElement,
          get hidden() {
            return !mounted();
          },
          get inert() {
            return !open();
          },
        })}
      </FloatingNode>
    </PopoverPositionerContext>
  );
}

export interface PopoverPositionerState {
  /**
   * Whether the popover is currently open.
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
   * Whether CSS transitions should be disabled.
   */
  instant: string | undefined;
}

export interface PopoverPositionerProps
  extends
    UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', PopoverPositionerState> {}

export namespace PopoverPositioner {
  export type State = PopoverPositionerState;
  export type Props = PopoverPositionerProps;
}
