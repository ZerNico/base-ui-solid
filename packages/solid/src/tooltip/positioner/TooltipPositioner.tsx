import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipPositionerContext } from './TooltipPositionerContext';
import { useAnchorPositioning } from '../../internals/useAnchorPositioning';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useTooltipPortalContext } from '../portal/TooltipPortalContext';
import { POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { usePositioner } from '../../utils/usePositioner';

/**
 * Positions the tooltip against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui-solid.pages.dev/solid/components/tooltip)
 */
export function TooltipPositioner(componentProps: TooltipPositioner.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
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
    'style',
  );

  const store = useTooltipRootContext();
  const keepMounted = useTooltipPortalContext();

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const trackCursorAxis = store.useState('trackCursorAxis');
  const disableHoverablePopup = store.useState('disableHoverablePopup');
  // Port note: the root store's floating root context never changes.
  const floatingRootContext = store.select('floatingRootContext');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const adaptiveOrigin = store.useState('adaptiveOrigin');

  const positioning = useAnchorPositioning({
    get anchor() {
      return componentProps.anchor;
    },
    get positionMethod() {
      return componentProps.positionMethod ?? 'absolute';
    },
    floatingRootContext,
    get mounted() {
      return mounted();
    },
    get side() {
      return componentProps.side ?? 'top';
    },
    get sideOffset() {
      return componentProps.sideOffset ?? 0;
    },
    get align() {
      return componentProps.align ?? 'center';
    },
    get alignOffset() {
      return componentProps.alignOffset ?? 0;
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
    get arrowPadding() {
      return componentProps.arrowPadding ?? 5;
    },
    get disableAnchorTracking() {
      return componentProps.disableAnchorTracking ?? false;
    },
    get keepMounted() {
      return keepMounted();
    },
    get collisionAvoidance() {
      return componentProps.collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE;
    },
    get adaptiveOrigin() {
      return adaptiveOrigin();
    },
  });

  const state = createMemo<TooltipPositionerState>(
    () => ({
      open: open(),
      side: positioning.side,
      align: positioning.align,
      anchorHidden: positioning.anchorHidden,
      instant: trackCursorAxis() !== 'none' ? 'tracking-cursor' : instantType(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const setPositionerElement = store.useStateSetter('positionerElement');

  return (
    <TooltipPositionerContext value={positioning}>
      {usePositioner(componentProps, state, {
        get styles() {
          return positioning.positionerStyles;
        },
        get transitionStatus() {
          return transitionStatus();
        },
        props: elementProps as HTMLProps<HTMLDivElement>,
        refs: [setPositionerElement],
        get hidden() {
          return !mounted();
        },
        get inert() {
          return !open() || trackCursorAxis() === 'both' || disableHoverablePopup();
        },
      })}
    </TooltipPositionerContext>
  );
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
