import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import { PreviewCardPositionerContext } from './PreviewCardPositionerContext';
import { FloatingNode, useFloatingNodeId } from '../../floating-ui-solid';
import { useAnchorPositioning } from '../../internals/useAnchorPositioning';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { usePreviewCardPortalContext } from '../portal/PreviewCardPortalContext';
import { POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { usePositioner } from '../../utils/usePositioner';
import { createInlineMiddleware } from '../../utils/popups';

/**
 * Positions the popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui-solid.pages.dev/solid/components/preview-card)
 */
export function PreviewCardPositioner(componentProps: PreviewCardPositioner.Props): JSX.Element {
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

  const store = usePreviewCardRootContext();
  const keepMounted = usePreviewCardPortalContext();
  const nodeId = useFloatingNodeId();

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  // Port note: the root store's floating root context never changes.
  const floatingRootContext = store.select('floatingRootContext');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const adaptiveOrigin = store.useState('adaptiveOrigin');
  const inlineRectCoordsRef = store.context.inlineRectCoordsRef;

  // Port note: upstream creates the middleware on every render; it reads the ref when it runs.
  const inline = createInlineMiddleware(inlineRectCoordsRef);

  const positioning = useAnchorPositioning({
    get anchor() {
      return componentProps.anchor;
    },
    floatingRootContext,
    get positionMethod() {
      return componentProps.positionMethod ?? 'absolute';
    },
    get mounted() {
      return mounted();
    },
    get side() {
      return componentProps.side ?? 'bottom';
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
    get arrowPadding() {
      return componentProps.arrowPadding ?? 5;
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
    inline,
  });
  const updatePosition = positioning.update;

  useIsoLayoutEffect(
    ([openValue, mountedValue]) => {
      if (openValue && mountedValue) {
        updatePosition();
      }
    },
    () => [open(), mounted(), updatePosition],
  );

  const state = createMemo<PreviewCardPositionerState>(() => ({
    open: open(),
    side: positioning.side,
    align: positioning.align,
    anchorHidden: positioning.anchorHidden,
    instant: instantType(),
  }));

  const setPositionerElement = store.useStateSetter('positionerElement');

  return (
    <PreviewCardPositionerContext value={positioning}>
      <FloatingNode id={nodeId}>
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
            return !open();
          },
        })}
      </FloatingNode>
    </PreviewCardPositionerContext>
  );
}

export interface PreviewCardPositionerState {
  /**
   * Whether the preview card is currently open.
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
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'focus' | undefined;
}

export interface PreviewCardPositionerProps
  extends
    UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', PreviewCardPositionerState> {}

export namespace PreviewCardPositioner {
  export type State = PreviewCardPositionerState;
  export type Props = PreviewCardPositionerProps;
}
