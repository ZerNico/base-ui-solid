import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { FloatingFocusManager } from '../../floating-ui-solid';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useDialogPortalContext } from '../portal/DialogPortalContext';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { COMPOSITE_KEYS } from '../../internals/composite/composite';
import { FOCUSABLE_POPUP_PROPS, createDefaultInitialFocus } from '../../utils/popups';
import * as DialogPopupCssVars from './DialogPopupCssVars';
import { dialogStateAttributesMapping } from '../utils/stateAttributesMapping';

/**
 * A container for the dialog contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogPopup(componentProps: DialogPopup.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'finalFocus',
    'initialFocus',
  );

  const store = useDialogRootContext();

  const descriptionElementId = store.useState('descriptionElementId');
  const disablePointerDismissal = store.useState('disablePointerDismissal');
  // Port note: the floating root context is created with the store and never replaced, so it's
  // read once.
  const floatingRootContext = store.select('floatingRootContext');
  const rootPopupProps = store.useState('popupProps');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const nested = store.useState('nested');
  const nestedOpenDialogCount = store.useState('nestedOpenDialogCount');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const titleElementId = store.useState('titleElementId');
  const transitionStatus = store.useState('transitionStatus');
  const role = store.useState('role');
  const floatingId = floatingRootContext.useState('floatingId');

  // Port note: called for its missing-portal check; the returned accessor is unused.
  void useDialogPortalContext();

  useOpenChangeComplete({
    open,
    ref: () => store.context.popupRef.current,
    onComplete() {
      if (open()) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  const defaultInitialFocus = createDefaultInitialFocus(store.context.popupRef);
  const resolvedInitialFocus = () =>
    componentProps.initialFocus === undefined ? defaultInitialFocus : componentProps.initialFocus;

  const nestedDialogOpen = () => nestedOpenDialogCount() > 0;

  const setPopupElement = store.useStateSetter('popupElement');

  function handleKeyDown(event: KeyboardEvent) {
    if (COMPOSITE_KEYS.has(event.key)) {
      event.stopPropagation();
    }
  }

  const state = createMemo<DialogPopupState>(() => ({
    open: open(),
    nested: nested(),
    transitionStatus: transitionStatus(),
    nestedDialogOpen: nestedDialogOpen(),
  }));

  const element = useRenderElement('div', componentProps, {
    state,
    props: () => [
      rootPopupProps(),
      {
        id: floatingId(),
        'aria-labelledby': titleElementId(),
        'aria-describedby': descriptionElementId(),
        role: role(),
        ...FOCUSABLE_POPUP_PROPS,
        hidden: !mounted(),
        onKeyDown: handleKeyDown,
        style: {
          [DialogPopupCssVars.nestedDialogs]: nestedOpenDialogCount(),
        } as JSX.CSSProperties,
      },
      elementProps,
    ],
    ref: [
      (element: HTMLElement | null) => {
        store.context.popupRef.current = element;
      },
      setPopupElement,
    ],
    stateAttributesMapping: dialogStateAttributesMapping,
  });

  return (
    <FloatingFocusManager
      context={floatingRootContext}
      openInteractionType={openMethod()}
      disabled={!mounted()}
      closeOnFocusOut={!disablePointerDismissal()}
      initialFocus={resolvedInitialFocus()}
      returnFocus={componentProps.finalFocus}
      modal={modal() !== false}
      restoreFocus="popup"
    >
      {element}
    </FloatingFocusManager>
  );
}

export interface DialogPopupProps extends BaseUIComponentProps<'div', DialogPopupState> {
  /**
   * Determines the element to focus when the dialog is opened.
   * By default, focus moves to the first tabbable element inside the popup, except when the dialog
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
    | ((openType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines the element to focus when the dialog is closed.
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
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
}

export interface DialogPopupState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether the dialog is nested within a parent dialog.
   */
  nested: boolean;
  /**
   * Whether the dialog has nested dialogs open.
   */
  nestedDialogOpen: boolean;
}

export namespace DialogPopup {
  export type Props = DialogPopupProps;
  export type State = DialogPopupState;
}
