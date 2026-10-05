import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import {
  useComboboxFloatingContext,
  useComboboxInputValueContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';
import { triggerStateAttributesMapping } from '../utils/stateAttributesMapping';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { stopEvent, contains, getTarget } from '../../floating-ui-solid/utils';
import { isMouseWithinBounds } from '../../utils/getPseudoElementBounds';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useClick, useTypeahead } from '../../floating-ui-solid';
import type { Side } from '../../internals/useAnchorPositioning';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { resolveAriaLabelledBy } from '../../utils/resolveAriaLabelledBy';
import { getComboboxPopupId } from '../root/utils';
import { useListEmpty, usePopupSide } from '../utils/parts';

/**
 * A button that opens the popup.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxTrigger(componentProps: ComboboxTrigger.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'nativeButton',
    'disabled',
    'id',
    'style',
  );

  const {
    state: fieldState,
    disabled: fieldDisabled,
    setTouched,
    validationMode,
    validation,
  } = useFieldRootContext();
  const { labelId: fieldLabelId } = useLabelableContext();
  const store = useComboboxRootContext();

  const selectionMode = store.useState('selectionMode');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const required = store.useState('required');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const storedPopupId = store.useState('popupId');
  const triggerProps = store.useState('triggerProps');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const rootId = store.useState('id');
  const comboboxLabelId = store.useState('labelId');
  const open = store.useState('open');
  const selectedValue = store.useState('selectedValue');
  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const hasSelectedValue = store.useState('hasSelectedValue');

  const floatingRootContext = useComboboxFloatingContext();
  const inputValue = useComboboxInputValueContext();

  const focusTimeout = useTimeout();

  const disabled = createMemo(
    () => (fieldDisabled() ?? false) || comboboxDisabled() || (componentProps.disabled ?? false),
  );
  const listEmpty = useListEmpty();
  const popupSide = usePopupSide(store);

  let triggerRef: HTMLElement | null = null;
  const setFocused = useSetFieldFocused(disabled, () => triggerRef);

  void useLabelableId({
    id: () => (inputInsidePopup() ? componentProps.id || undefined : undefined),
  });
  const id = () => (inputInsidePopup() ? (componentProps.id ?? rootId()) : componentProps.id);
  const ariaLabelledBy = () => resolveAriaLabelledBy(fieldLabelId(), comboboxLabelId());

  const ariaControls = () => {
    if (open() && inputInsidePopup()) {
      // Fall back to the default id while the popup registers its own (custom ids are stored once the
      // popup mounts), so `aria-controls` is set on the same commit `open` becomes `true`.
      return storedPopupId() ?? getComboboxPopupId(rootId());
    }
    if (open()) {
      return listElement()?.id;
    }
    return undefined;
  };

  let currentPointerTypeRef: PointerEvent['pointerType'] = '';

  function trackPointerType(event: PointerEvent) {
    currentPointerTypeRef = event.pointerType;
  }

  const triggerTypeahead = useTypeahead(floatingRootContext, {
    // Typeahead on a closed trigger commits a value rather than moving a highlight, so it stays
    // gated on `readOnly`.
    get enabled() {
      return !open() && !readOnly() && !comboboxDisabled() && selectionMode() === 'single';
    },
    listRef: store.context.labelsRef,
    get activeIndex() {
      return activeIndex();
    },
    get selectedIndex() {
      return selectedIndex();
    },
    onMatch(index) {
      const nextSelectedValue = store.context.valuesRef.current[index];
      if (nextSelectedValue !== undefined) {
        store.context.setSelectedValue(nextSelectedValue, createChangeEventDetails(REASONS.none));
      }
    },
  });

  const triggerClick = useClick(floatingRootContext, {
    get enabled() {
      return !comboboxDisabled();
    },
    event: 'mousedown',
  });

  const { buttonRef, getButtonProps } = useButton({
    native: () => componentProps.nativeButton ?? true,
    disabled,
  });

  const state = createMemo<ComboboxTriggerState>(
    () => ({
      ...fieldState(),
      readOnly: readOnly(),
      open: open(),
      disabled: disabled(),
      popupSide: popupSide(),
      listEmpty: listEmpty(),
      placeholder: selectionMode() === 'none' ? false : !hasSelectedValue(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const setTriggerElement = (element: HTMLElement | null) => {
    store.set('triggerElement', element);
  };

  return useRenderElement('button', componentProps, {
    ref: [
      buttonRef,
      (element: HTMLElement | null) => {
        triggerRef = element;
      },
      setTriggerElement,
    ],
    state,
    props: () => [
      triggerProps(),
      triggerClick.reference,
      triggerTypeahead.reference,
      {
        id: id(),
        tabindex: inputInsidePopup() ? 0 : -1,
        role: inputInsidePopup() ? 'combobox' : undefined,
        'aria-expanded': open(),
        'aria-haspopup': inputInsidePopup() ? 'dialog' : 'listbox',
        'aria-controls': ariaControls(),
        'aria-required': inputInsidePopup() ? required() || undefined : undefined,
        // Only valid alongside the `combobox` role; without it the trigger is a plain button, and
        // the `Combobox.Input` outside the popup already carries `aria-readonly`.
        'aria-readonly': inputInsidePopup() ? readOnly() || undefined : undefined,
        'aria-labelledby': ariaLabelledBy(),
        onPointerDown: trackPointerType,
        onPointerEnter: trackPointerType,
        // Port note: React's `onFocus`/`onBlur` bubble, so they're `onFocusIn`/`onFocusOut` here.
        onFocusIn() {
          setFocused(true);

          if (untrack(disabled)) {
            return;
          }

          focusTimeout.start(0, store.context.forceMount);
        },
        onFocusOut(event: FocusEvent) {
          // If focus is moving into the popup, don't count it as a blur.
          if (contains(untrack(positionerElement), event.relatedTarget as Element | null)) {
            return;
          }

          setTouched(true);
          setFocused(false);

          if (untrack(validationMode) === 'onBlur') {
            const valueToValidate =
              untrack(selectionMode) === 'none' ? untrack(inputValue) : untrack(selectedValue);
            validation.commit(valueToValidate);
          }
        },
        onMouseDown(event: MouseEvent) {
          if (untrack(disabled)) {
            return;
          }

          const isInputInsidePopup = untrack(inputInsidePopup);

          if (!isInputInsidePopup) {
            floatingRootContext.set('domReferenceElement', event.currentTarget as Element);
          }

          // Ensure items are registered for initial selection highlight.
          store.context.forceMount();

          if (currentPointerTypeRef !== 'touch') {
            store.context.inputRef.current?.focus();

            if (!isInputInsidePopup) {
              event.preventDefault();
            }
          }

          if (untrack(open)) {
            return;
          }

          const doc = ownerDocument(event.currentTarget as Element);

          function handleMouseUp(mouseEvent: MouseEvent) {
            const currentTriggerElement = store.state.triggerElement;
            if (!currentTriggerElement) {
              return;
            }

            const mouseUpTarget = getTarget(mouseEvent) as Element | null;
            const positioner = store.state.positionerElement;
            const list = store.state.listElement;

            if (
              contains(currentTriggerElement, mouseUpTarget) ||
              contains(positioner, mouseUpTarget) ||
              contains(list, mouseUpTarget)
            ) {
              return;
            }

            if (isMouseWithinBounds(mouseEvent, currentTriggerElement)) {
              return;
            }

            store.context.setOpen(false, createChangeEventDetails(REASONS.cancelOpen, mouseEvent));
          }

          if (isInputInsidePopup) {
            doc.addEventListener('mouseup', handleMouseUp, { once: true });
          }
        },
        onKeyDown(event: KeyboardEvent) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            stopEvent(event);
            store.context.setOpen(true, createChangeEventDetails(REASONS.listNavigation, event));
            store.context.inputRef.current?.focus();
          }
        },
      },
      validation.getValidationProps(disabled(), elementProps as HTMLProps),
      getButtonProps,
    ],
    stateAttributesMapping: triggerStateAttributesMapping,
  });
}

export interface ComboboxTriggerState extends FieldRootState {
  /**
   * Whether the popup is open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component should ignore user edits.
   */
  readOnly: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * Present when the corresponding items list is empty.
   */
  listEmpty: boolean;
  /**
   * Whether the combobox doesn't have a value.
   */
  placeholder: boolean;
}

export interface ComboboxTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxTriggerState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxTrigger {
  export type State = ComboboxTriggerState;
  export type Props = ComboboxTriggerProps;
}
