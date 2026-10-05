import { createMemo, omit } from 'solid-js';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { FloatingFocusManager, useHoverFloatingInteraction } from '../../floating-ui-solid';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useRenderElement } from '../../internals/useRenderElement';
import { REASONS } from '../../internals/reasons';
import { COMPOSITE_KEYS } from '../../internals/composite/composite';
import { useToolbarRootContext } from '../../toolbar/root/ToolbarRootContext';
import { getDisabledMountTransitionStyles } from '../../internals/getDisabledMountTransitionStyles';
import { ClosePartContext, useClosePartCount } from '../../utils/closePart';
import { FOCUSABLE_POPUP_PROPS, createDefaultInitialFocus } from '../../utils/popups';

/**
 * A container for the popover contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverPopup(componentProps: PopoverPopup.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'initialFocus',
    'finalFocus',
  );

  const store = usePopoverRootContext();

  const positioner = usePopoverPositionerContext();
  const insideToolbar = useToolbarRootContext(true) != null;
  const { context: closePartContext, hasClosePart } = useClosePartCount();

  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const titleId = store.useState('titleElementId');
  const descriptionId = store.useState('descriptionElementId');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const openReason = store.useState('openChangeReason');
  const activeTriggerElement = store.useState('activeTriggerElement');
  // Port note: the floating root context is created with the store and never replaced, so it's
  // read once.
  const floatingContext = store.select('floatingRootContext');
  const floatingId = floatingContext.useState('floatingId');
  const disabled = store.useState('disabled');
  const openOnHover = store.useState('openOnHover');
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
      return openOnHover() && !disabled();
    },
    get closeDelay() {
      return closeDelay();
    },
  });

  const defaultInitialFocus = createDefaultInitialFocus(store.context.popupRef);
  const resolvedInitialFocus = () =>
    componentProps.initialFocus === undefined ? defaultInitialFocus : componentProps.initialFocus;

  const focusManagerModal = () => modal() !== false && hasClosePart();
  store.useSyncedValue('focusManagerModal', focusManagerModal);

  const setPopupElement = store.useStateSetter('popupElement');

  const state = createMemo<PopoverPopupState>(
    () => ({
      open: open(),
      side: positioner.side,
      align: positioner.align,
      instant: instantType(),
      transitionStatus: transitionStatus(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return (
    <FloatingFocusManager
      context={floatingContext}
      openInteractionType={openMethod()}
      modal={focusManagerModal()}
      disabled={!mounted() || openReason() === REASONS.triggerHover}
      initialFocus={resolvedInitialFocus()}
      returnFocus={componentProps.finalFocus}
      restoreFocus="popup"
      getInsideElements={() => [store.context.beforeTriggerFocusGuardRef.current]}
      previousFocusableElement={
        isHTMLElement(activeTriggerElement()) ? (activeTriggerElement() as HTMLElement) : undefined
      }
      nextFocusableElement={store.context.triggerFocusTargetRef}
      beforeContentFocusGuardRef={store.context.beforeContentFocusGuardRef}
    >
      <ClosePartContext value={closePartContext}>
        {useRenderElement('div', componentProps, {
          state,
          ref: [
            (element: HTMLElement | null) => {
              store.context.popupRef.current = element;
            },
            setPopupElement,
          ],
          props: () => [
            popupProps(),
            {
              id: floatingId(),
              role: 'dialog',
              ...FOCUSABLE_POPUP_PROPS,
              'aria-labelledby': titleId(),
              'aria-describedby': descriptionId(),
              onKeyDown(event: KeyboardEvent) {
                if (insideToolbar && COMPOSITE_KEYS.has(event.key)) {
                  event.stopPropagation();
                }
              },
            },
            getDisabledMountTransitionStyles(transitionStatus()),
            elementProps,
          ],
          stateAttributesMapping: popupTransitionStateMapping,
        })}
      </ClosePartContext>
    </FloatingFocusManager>
  );
}

export interface PopoverPopupState {
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
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'click' | 'focus' | 'trigger-change' | undefined;
}

export interface PopoverPopupProps extends BaseUIComponentProps<'div', PopoverPopupState> {
  /**
   * Determines the element to focus when the popover is opened.
   * By default, focus moves to the first tabbable element inside the popup, except when the popover
   * is opened by touch — then the popup itself is focused to avoid opening the virtual keyboard.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (first tabbable element or popup).
   * - `HTMLElement`: Move focus to the element. `null` (an element that isn't set yet) falls back
   *   to the default behavior.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, `null` to fall back to the default behavior, or `false`/`undefined` to do nothing.
   */
  initialFocus?:
    | boolean
    | HTMLElement
    | null
    | ((openType: InteractionType) => void | boolean | HTMLElement | null)
    | undefined;
  /**
   * Determines the element to focus when the popover is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `HTMLElement`: Move focus to the element. `null` (an element that isn't set yet) falls back
   *   to the default behavior.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, `null` to fall back to the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | boolean
    | HTMLElement
    | null
    | ((closeType: InteractionType) => void | boolean | HTMLElement | null)
    | undefined;
}

export namespace PopoverPopup {
  export type State = PopoverPopupState;
  export type Props = PopoverPopupProps;
}
