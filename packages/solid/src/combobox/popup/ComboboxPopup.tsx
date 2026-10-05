import { createMemo, omit, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { FloatingFocusManager } from '../../floating-ui-solid';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useComboboxFloatingContext, useComboboxRootContext } from '../root/ComboboxRootContext';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { contains, getTarget } from '../../floating-ui-solid/utils';
import { getDisabledMountTransitionStyles } from '../../internals/getDisabledMountTransitionStyles';
import { ComboboxInternalDismissButton } from '../utils/ComboboxInternalDismissButton';
import { getComboboxPopupId } from '../root/utils';
import { useListEmpty } from '../utils/parts';

const stateAttributesMapping: StateAttributesMapping<ComboboxPopupState> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * A container for the list.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxPopup(componentProps: ComboboxPopup.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'initialFocus',
    'finalFocus',
  );

  const store = useComboboxRootContext();
  const positioning = useComboboxPositionerContext();
  const floatingRootContext = useComboboxFloatingContext();

  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const popupProps = store.useState('popupProps');
  const transitionStatus = store.useState('transitionStatus');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const inputElement = store.useState('inputElement');
  const modal = store.useState('modal');
  const rootId = store.useState('id');

  const empty = useListEmpty();
  const popupId = () =>
    (elementProps as { id?: string | undefined }).id ??
    (inputInsidePopup() ? getComboboxPopupId(rootId()) : undefined);

  useIsoLayoutEffect(
    ([popupIdValue]) => {
      // Prefer the rendered DOM id, which a `render` prop element or function may override.
      store.set('popupId', store.context.popupRef.current?.id || popupIdValue);
      return () => {
        store.set('popupId', undefined);
      };
    },
    () => [popupId(), store] as const,
  );

  useOpenChangeComplete({
    open,
    ref: () => store.context.popupRef.current,
    onComplete() {
      if (untrack(open)) {
        store.context.onOpenChangeComplete(true);
      }
    },
  });

  const state = createMemo<ComboboxPopupState>(
    () => ({
      open: open(),
      side: positioning.side,
      align: positioning.align,
      anchorHidden: positioning.anchorHidden,
      transitionStatus: transitionStatus(),
      empty: empty(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const renderElement = () =>
    useRenderElement('div', componentProps, {
      state,
      ref: [
        (element: HTMLDivElement | null) => {
          store.context.popupRef.current = element;
        },
      ],
      props: () => [
        popupProps(),
        {
          id: popupId(),
          role: inputInsidePopup() ? 'dialog' : 'presentation',
          // Port note: React's `onFocus` bubbles, so it's `onFocusIn` here.
          onFocusIn(event: FocusEvent) {
            const target = getTarget(event) as Element | null;
            if (
              untrack(openMethod) !== 'touch' &&
              (contains(store.state.listElement, target) || target === event.currentTarget)
            ) {
              store.context.inputRef.current?.focus();
            }
          },
        },
        getDisabledMountTransitionStyles(transitionStatus()),
        elementProps,
      ],
      stateAttributesMapping,
    });

  // Default initial focus logic:
  // If opened by touch, focus the popup element to prevent the virtual keyboard from opening
  // (this is required for Android specifically as iOS handles this automatically).
  const computedDefaultInitialFocus = () =>
    inputInsidePopup()
      ? (interactionType: InteractionType) =>
          interactionType === 'touch' ? store.context.popupRef.current : untrack(inputElement)
      : false;

  const resolvedInitialFocus = () =>
    componentProps.initialFocus === undefined
      ? computedDefaultInitialFocus()
      : componentProps.initialFocus;

  const resolvedFinalFocus = (): ComboboxPopup.Props['finalFocus'] | boolean | undefined => {
    const finalFocus = componentProps.finalFocus;
    if (finalFocus != null) {
      return finalFocus;
    }
    return inputInsidePopup() ? undefined : false;
  };

  const focusManagerModal = () => !inputInsidePopup() || modal();

  return (
    <FloatingFocusManager
      context={floatingRootContext}
      disabled={!mounted()}
      modal={focusManagerModal()}
      openInteractionType={openMethod()}
      initialFocus={resolvedInitialFocus()}
      returnFocus={resolvedFinalFocus()}
      getInsideElements={() => [
        store.context.startDismissRef.current,
        store.context.endDismissRef.current,
      ]}
    >
      <>
        {renderElement()}
        <Show when={focusManagerModal()}>
          <ComboboxInternalDismissButton
            ref={(element: HTMLSpanElement | null) => {
              store.context.endDismissRef.current = element;
            }}
          />
        </Show>
      </>
    </FloatingFocusManager>
  );
}

export interface ComboboxPopupState {
  /**
   * Whether the component is open.
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
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether there are no items to display.
   */
  empty: boolean;
}

export interface ComboboxPopupProps extends BaseUIComponentProps<'div', ComboboxPopupState> {
  /**
   * Determines the element to focus when the popup is opened.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (first tabbable element or popup).
   * - `HTMLElement`: Move focus to the element. `null` (an element that isn't set yet) falls back
   *   to the default behavior.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  initialFocus?:
    | boolean
    | HTMLElement
    | null
    | ((openType: InteractionType) => void | boolean | HTMLElement | null)
    | undefined;
  /**
   * Determines the element to focus when the popup is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `HTMLElement`: Move focus to the element. `null` (an element that isn't set yet) falls back
   *   to the default behavior.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | boolean
    | HTMLElement
    | null
    | ((closeType: InteractionType) => void | boolean | HTMLElement | null)
    | undefined;
}

export namespace ComboboxPopup {
  export type State = ComboboxPopupState;
  export type Props = ComboboxPopupProps;
}
