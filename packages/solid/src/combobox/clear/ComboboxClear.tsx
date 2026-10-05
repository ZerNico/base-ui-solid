import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useComboboxInputValueContext, useComboboxRootContext } from '../root/ComboboxRootContext';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { getHighlightReason } from '../../utils/getHighlightReason';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';

const stateAttributesMapping: StateAttributesMapping<ComboboxClearState> = {
  ...transitionStatusMapping,
  ...triggerOpenStateMapping,
};

/**
 * Clears the value when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxClear(componentProps: ComboboxClear.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'disabled',
    'nativeButton',
    'keepMounted',
    'style',
  );

  const { disabled: fieldDisabled } = useFieldRootContext();
  const store = useComboboxRootContext();

  const selectionMode = store.useState('selectionMode');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const open = store.useState('open');
  const selectedValue = store.useState('selectedValue');
  const hasSelectionChips = store.useState('hasSelectionChips');

  const inputValue = useComboboxInputValueContext();

  const visible = createMemo(() => {
    const mode = selectionMode();
    if (mode === 'none') {
      return inputValue() !== '';
    }
    if (mode === 'single') {
      return selectedValue() != null;
    }
    return hasSelectionChips();
  });

  const disabled = createMemo(
    () => (fieldDisabled() ?? false) || comboboxDisabled() || (componentProps.disabled ?? false),
  );

  const { buttonRef, getButtonProps } = useButton({
    native: () => componentProps.nativeButton ?? true,
    disabled,
  });

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(visible);

  const state = createMemo<ComboboxClearState>(
    () => ({
      disabled: disabled(),
      visible: visible(),
      open: open(),
      transitionStatus: transitionStatus(),
    }),
    { equals: fastObjectShallowCompare },
  );

  useOpenChangeComplete({
    open: visible,
    ref: () => store.context.clearRef.current,
    onComplete() {
      if (!untrack(visible)) {
        setMounted(false);
      }
    },
  });

  const shouldRender = () => (componentProps.keepMounted ?? false) || mounted();

  return useRenderElement('button', componentProps, {
    enabled: shouldRender,
    state,
    ref: [
      buttonRef,
      (element: HTMLButtonElement | null) => {
        store.context.clearRef.current = element;
      },
    ],
    props: () => [
      {
        tabindex: -1,
        children: 'x',
        // Avoid stealing focus from the input.
        onMouseDown(event: MouseEvent) {
          event.preventDefault();
        },
        onClick(event: MouseEvent) {
          if (untrack(disabled) || untrack(readOnly)) {
            return;
          }

          const type = getHighlightReason(event);

          store.context.setInputValue('', createChangeEventDetails(REASONS.clearPress, event));

          if (untrack(selectionMode) !== 'none') {
            store.context.setSelectedValue(
              Array.isArray(untrack(selectedValue)) ? [] : null,
              createChangeEventDetails(REASONS.clearPress, event),
            );
            // A distinct object shape: `Store.update` iterates own keys, so passing an explicit
            // `selectedIndex: undefined` would overwrite the state instead of leaving it alone.
            store.context.setIndices({
              activeIndex: null,
              selectedIndex: null,
              type,
              event,
            });
          } else {
            store.context.setIndices({ activeIndex: null, type, event });
          }

          store.context.inputRef.current?.focus();
        },
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });
}

export interface ComboboxClearState {
  /**
   * Whether the popup is open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the clear button should be visible.
   */
  visible: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface ComboboxClearProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxClearState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the component should remain mounted in the DOM when not visible.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace ComboboxClear {
  export type State = ComboboxClearState;
  export type Props = ComboboxClearProps;
}
