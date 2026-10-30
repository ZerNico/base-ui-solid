import { Show } from 'solid-js';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { FloatingNode, useFloatingNodeId } from '../../utils/popups/tree/FloatingTree';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverPositionerContext } from './PopoverPositionerContext';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { usePopoverPortalContext } from '../portal/PopoverPortalContext';
import { InternalBackdrop } from '../../utils/popups/InternalBackdrop';
import { REASONS } from '../../internals/reasons';
import { useTriggerSwitchTransition } from '../../internals/useTriggerSwitchTransition';
import { usePopupPositioner } from '../../utils/popups/popupPositioner';
import { useAnchoredPopupScrollLock } from '../../utils/popups/useAnchoredPopupScrollLock';

/**
 * Positions the popover against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverPositioner(componentProps: PopoverPositioner.Props) {
  const store = usePopoverRootContext();
  const keepMounted = usePopoverPortalContext();
  const nodeId = useFloatingNodeId();

  const { element, positioning, open, mounted } = usePopupPositioner(store, componentProps, {
    keepMounted,
    positioning: { nodeId },
  });

  const openReason = store.useState('openChangeReason');
  const triggerElement = store.useState('activeTriggerElement');
  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const domReference = store.useState('anchorElement');

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

  return (
    <PopoverPositionerContext value={positioning}>
      <Show when={mounted() && trueModalNonHover()}>
        <InternalBackdrop inert={inertValue(!open())} cutout={triggerElement()} />
      </Show>
      <FloatingNode id={nodeId}>{element()}</FloatingNode>
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
