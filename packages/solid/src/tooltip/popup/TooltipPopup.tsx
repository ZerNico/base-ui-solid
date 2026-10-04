import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
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
 * A container for the tooltip contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipPopup(componentProps: TooltipPopup.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useTooltipRootContext();
  const positioner = useTooltipPositionerContext();

  const open = store.useState('open');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  // Port note: the root store's floating root context never changes.
  const floatingContext = store.select('floatingRootContext');
  const disabled = store.useState('disabled');
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
    get enabled() {
      return !disabled();
    },
    get closeDelay() {
      return closeDelay();
    },
  });

  const setPopupElement = store.useStateSetter('popupElement');

  const state = createMemo<TooltipPopupState>(() => ({
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
      setPopupElement,
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

export interface TooltipPopupState {
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
   * Whether transitions should be skipped.
   */
  instant: 'delay' | 'focus' | 'dismiss' | undefined;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface TooltipPopupProps extends BaseUIComponentProps<'div', TooltipPopupState> {}

export namespace TooltipPopup {
  export type State = TooltipPopupState;
  export type Props = TooltipPopupProps;
}
