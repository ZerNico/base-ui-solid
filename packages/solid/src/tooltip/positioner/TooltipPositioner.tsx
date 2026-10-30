import type { JSX } from '@solidjs/web';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipPositionerContext } from './TooltipPositionerContext';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { useTooltipPortalContext } from '../portal/TooltipPortalContext';
import { usePopupPositioner } from '../../utils/popups/popupPositioner';

/**
 * Positions the tooltip against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui-solid.pages.dev/solid/components/tooltip)
 */
export function TooltipPositioner(componentProps: TooltipPositioner.Props): JSX.Element {
  const store = useTooltipRootContext();
  const keepMounted = useTooltipPortalContext();

  const open = store.useState('open');
  const trackCursorAxis = store.useState('trackCursorAxis');
  const disableHoverablePopup = store.useState('disableHoverablePopup');
  const instantType = store.useState('instantType');

  const { element, positioning } = usePopupPositioner(store, componentProps, {
    keepMounted,
    positioning: {
      get side() {
        return componentProps.side ?? 'top';
      },
    },
    state: () => ({ instant: trackCursorAxis() !== 'none' ? 'tracking-cursor' : instantType() }),
    inert: () => !open() || trackCursorAxis() === 'both' || disableHoverablePopup(),
  });

  return <TooltipPositionerContext value={positioning}>{element()}</TooltipPositionerContext>;
}

export interface TooltipPositionerState {
  /**
   * Whether the tooltip is currently open.
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

export interface TooltipPositionerProps
  extends
    BaseUIComponentProps<'div', TooltipPositionerState>,
    Omit<UseAnchorPositioningSharedParameters, 'side'> {
  /**
   * Which side of the anchor element to align the popup against.
   * May automatically change to avoid collisions.
   * @default 'top'
   */
  side?: Side | undefined;
}

export namespace TooltipPositioner {
  export type State = TooltipPositionerState;
  export type Props = TooltipPositionerProps;
}
