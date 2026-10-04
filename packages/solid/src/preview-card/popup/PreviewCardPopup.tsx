import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import { usePreviewCardPositionerContext } from '../positioner/PreviewCardPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import type { Align, Side } from '../../internals/useAnchorPositioning';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useRenderElement } from '../../internals/useRenderElement';
import { getDisabledMountTransitionStyles } from '../../internals/getDisabledMountTransitionStyles';
import { useHoverFloatingInteraction } from '../../floating-ui-react';
import { FOCUSABLE_POPUP_PROPS } from '../../utils/popups';

/**
 * A container for the preview card contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardPopup(componentProps: PreviewCardPopup.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = usePreviewCardRootContext();
  const positioner = usePreviewCardPositionerContext();

  const open = store.useState('open');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  // Port note: the root store's floating root context never changes.
  const floatingContext = store.select('floatingRootContext');
  const closeDelay = store.useState('closeDelay');

  useOpenChangeComplete({
    open,
    ref: () => store.context.popupRef.current,
    onComplete() {
      if (open()) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  useHoverFloatingInteraction(floatingContext, {
    get closeDelay() {
      return closeDelay();
    },
  });

  const state = createMemo<PreviewCardPopupState>(() => ({
    open: open(),
    side: positioner.side,
    align: positioner.align,
    instant: instantType(),
    transitionStatus: transitionStatus(),
  }));

  return useRenderElement('div', componentProps, {
    state,
    ref: [
      (element: HTMLElement | null) => {
        store.context.popupRef.current = element;
      },
      store.useStateSetter('popupElement'),
    ],
    props: () => [
      FOCUSABLE_POPUP_PROPS,
      popupProps(),
      getDisabledMountTransitionStyles(transitionStatus()),
      elementProps,
    ],
    stateAttributesMapping: popupTransitionStateMapping,
  });
}

export interface PreviewCardPopupState {
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
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'focus' | undefined;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface PreviewCardPopupProps extends BaseUIComponentProps<'div', PreviewCardPopupState> {}

export namespace PreviewCardPopup {
  export type State = PreviewCardPopupState;
  export type Props = PreviewCardPopupProps;
}
