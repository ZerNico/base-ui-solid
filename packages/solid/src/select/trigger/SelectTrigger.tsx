import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useValueAsRef } from '@base-ui-solid/utils/useValueAsRef';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useSelectRootContext } from '../root/SelectRootContext';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import { useRenderElement } from '../../internals/useRenderElement';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { isMouseWithinBounds } from '../../utils/getPseudoElementBounds';
import { contains, getFloatingFocusElement } from '../../floating-ui-solid/utils';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { useButton } from '../../internals/use-button';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { resolveAriaLabelledBy } from '../../utils/resolveAriaLabelledBy';
import type { Side } from '../../internals/useAnchorPositioning';
import * as SelectTriggerDataAttributes from './SelectTriggerDataAttributes';

const SELECTED_DELAY = 400;

const stateAttributesMapping: StateAttributesMapping<SelectTriggerState> = {
  ...pressableTriggerOpenStateMapping,
  ...fieldValidityMapping,
  popupSide: (side: Side | null) =>
    side ? { [SelectTriggerDataAttributes.popupSide]: side } : null,
  value: () => null,
};

/**
 * A button that opens the select popup.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectTrigger(componentProps: SelectTrigger.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'id',
    'disabled',
    'nativeButton',
    'style',
  );

  const {
    setTouched,
    validationMode,
    validation,
    state: fieldState,
    disabled: fieldDisabled,
  } = useFieldRootContext();
  const { labelId: fieldLabelId } = useLabelableContext();
  const store = useSelectRootContext();
  const readOnly = store.useState('readOnly');
  const required = store.useState('required');
  const selectDisabled = store.useState('disabled');
  const disabled = () => fieldDisabled() || selectDisabled() || (componentProps.disabled ?? false);

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const value = store.useState('value');
  const triggerProps = store.useState('triggerProps');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const popupSideValue = store.useState('popupSide');
  const rootId = store.useState('id');
  const selectLabelId = store.useState('labelId');
  const hasSelectedValue = store.useState('hasSelectedValue');
  const popupSide = () => (mounted() && positionerElement() ? popupSideValue() : null);

  const id = () => (componentProps.id as string | undefined) ?? rootId();
  const ariaLabelledBy = () => resolveAriaLabelledBy(fieldLabelId(), selectLabelId());

  void useLabelableId({ id: () => componentProps.id as string | undefined });

  const positionerRef = useValueAsRef(positionerElement);

  let triggerElement: HTMLElement | null = null;
  const triggerRef = (element: HTMLElement | null) => {
    triggerElement = element;
  };
  const setFocused = useSetFieldFocused(disabled, () => triggerElement);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: () => componentProps.nativeButton ?? true,
  });

  const setTriggerElement = store.useStateSetter('triggerElement');

  const timeoutFocus = useTimeout();
  const timeoutMouseDown = useTimeout();
  const selectedDelayTimeout = useTimeout();

  useEffect(
    ([isOpen]) => {
      if (isOpen) {
        // A mousedown on the trigger can open the popup under the cursor. Keep mouseup selection
        // disabled briefly so releasing over either the selected item or a neighboring item doesn't
        // commit an accidental selection. SelectItem can still opt into unselected mouseup sooner
        // after a real drag over the item.
        selectedDelayTimeout.start(SELECTED_DELAY, () => {
          store.context.selectionRef.current.allowUnselectedMouseUp = true;
          store.context.selectionRef.current.allowSelectedMouseUp = true;
        });

        return () => {
          selectedDelayTimeout.clear();
        };
      }

      store.context.selectionRef.current = {
        allowSelectedMouseUp: false,
        allowUnselectedMouseUp: false,
        dragY: 0,
      };

      timeoutMouseDown.clear();

      return undefined;
    },
    () => [open()],
  );

  const props = createMemo(() => {
    const isOpen = open();
    const currentPositionerElement = positionerElement();
    const currentListElement = listElement();
    const isDisabled = disabled();

    const mergedProps: HTMLProps = mergePropsSnapshot<any>(
      triggerProps(),
      {
        id: id(),
        role: 'combobox',
        'aria-expanded': isOpen,
        'aria-haspopup': 'listbox',
        'aria-controls': isOpen
          ? (currentListElement?.id ?? getFloatingFocusElement(currentPositionerElement)?.id)
          : undefined,
        'aria-labelledby': ariaLabelledBy(),
        'aria-readonly': readOnly() || undefined,
        'aria-required': required() || undefined,
        tabindex: isDisabled ? -1 : 0,
        // Port note: React's `onFocus` bubbles, so it's `onFocusIn` here.
        onFocusIn(event: FocusEvent) {
          setFocused(true);

          // The popup element shouldn't obscure the focused trigger.
          if (store.state.open && store.context.alignItemWithTriggerActiveRef.current) {
            store.context.setOpen(false, createChangeEventDetails(REASONS.none, event));
          }

          // Saves a re-render on initial click: `forceMount === true` mounts
          // the items before `open === true`. We could sync those cycles better
          // without a timeout, but this is enough for now.
          timeoutFocus.start(0, () => {
            store.set('forceMount', true);
          });
        },
        // Port note: React's `onBlur` bubbles, so it's `onFocusOut` here.
        onFocusOut(event: FocusEvent) {
          // If focus is moving into the popup, don't count it as a blur.
          if (contains(store.state.positionerElement, event.relatedTarget as Element | null)) {
            return;
          }

          setTouched(true);
          setFocused(false);

          if (untrack(validationMode) === 'onBlur') {
            validation.commit(store.state.value);
          }
        },
        onMouseDown(event: MouseEvent) {
          if (store.state.open) {
            return;
          }

          const doc = ownerDocument(event.currentTarget as Element);

          function handleMouseUp(mouseEvent: MouseEvent) {
            if (!triggerElement) {
              return;
            }

            const mouseUpTarget = mouseEvent.target as Element | null;

            // Don't treat the release as an outside press when it lands on the trigger or inside
            // the popup positioner (or their children).
            if (
              contains(triggerElement, mouseUpTarget) ||
              contains(positionerRef.current, mouseUpTarget)
            ) {
              return;
            }

            if (isMouseWithinBounds(mouseEvent, triggerElement)) {
              return;
            }

            store.context.setOpen(false, createChangeEventDetails(REASONS.cancelOpen, mouseEvent));
          }

          // Firefox can fire this upon mousedown
          timeoutMouseDown.start(0, () => {
            doc.addEventListener('mouseup', handleMouseUp, { once: true });
          });
        },
      },
      elementProps,
      getButtonProps,
    );
    const validationProps = validation.getValidationProps(isDisabled, mergedProps);

    // ensure nested useButton does not overwrite the combobox role:
    // <Toolbar.Button render={<Select.Trigger />} />
    validationProps.role = 'combobox';

    return validationProps;
  });

  const state = createMemo<SelectTriggerState>(() => ({
    ...fieldState(),
    open: open(),
    disabled: disabled(),
    value: value(),
    readOnly: readOnly(),
    popupSide: popupSide(),
    placeholder: !hasSelectedValue(),
  }));

  return useRenderElement('button', componentProps, {
    ref: [triggerRef, buttonRef, setTriggerElement],
    state,
    stateAttributesMapping,
    props,
  });
}

export interface SelectTriggerState extends FieldRootState {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
  /**
   * Whether the select popup is readonly.
   */
  readOnly: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * The value of the currently selected item.
   */
  value: any;
  /**
   * Whether the select doesn't have a value.
   */
  placeholder: boolean;
}

export interface SelectTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', SelectTriggerState> {
  children?: JSX.Element | undefined;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled?: boolean | undefined;
}

export namespace SelectTrigger {
  export type State = SelectTriggerState;
  export type Props = SelectTriggerProps;
}
