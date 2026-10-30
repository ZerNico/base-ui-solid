import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import { PreviewCardPositionerContext } from './PreviewCardPositionerContext';
import { FloatingNode, useFloatingNodeId } from '../../utils/popups/tree/FloatingTree';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { usePreviewCardPortalContext } from '../portal/PreviewCardPortalContext';
import { usePopupPositioner } from '../../utils/popups/popupPositioner';
import { createInlineMiddleware } from '../../utils/popups/inlineRect';

/**
 * Positions the popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui-solid.pages.dev/solid/components/preview-card)
 */
export function PreviewCardPositioner(componentProps: PreviewCardPositioner.Props): JSX.Element {
  const store = usePreviewCardRootContext();
  const keepMounted = usePreviewCardPortalContext();
  const nodeId = useFloatingNodeId();

  const inlineRectCoordsRef = store.context.inlineRectCoordsRef;

  const { element, positioning, open, mounted } = usePopupPositioner(store, componentProps, {
    keepMounted,
    positioning: {
      nodeId,
      // Port note: upstream creates the middleware on every render; it reads the ref when it runs.
      inline: createInlineMiddleware(inlineRectCoordsRef),
    },
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

  return (
    <PreviewCardPositionerContext value={positioning}>
      <FloatingNode id={nodeId}>{element()}</FloatingNode>
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
