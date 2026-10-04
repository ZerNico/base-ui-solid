import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import type { Side } from '../../internals/useAnchorPositioning';
import { triggerStateAttributesMapping } from '../utils/stateAttributesMapping';
import { handleInputPress } from '../utils/handleInputPress';
import { useListEmpty, usePopupSide } from '../utils/parts';
import { contains } from '../../floating-ui-react/utils/element';

/**
 * A wrapper for the input and its associated controls.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxInputGroup(componentProps: ComboboxInputGroup.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { state: fieldState } = useFieldRootContext();
  const store = useComboboxRootContext();

  const open = store.useState('open');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const hasSelectedValue = store.useState('hasSelectedValue');
  const selectionMode = store.useState('selectionMode');

  const popupSide = usePopupSide(store);
  const disabled = comboboxDisabled;
  const listEmpty = useListEmpty();
  const placeholder = () => (selectionMode() === 'none' ? false : !hasSelectedValue());

  const state = createMemo<ComboboxInputGroup.State>(() => ({
    ...fieldState(),
    open: open(),
    disabled: disabled(),
    readOnly: readOnly(),
    popupSide: popupSide(),
    listEmpty: listEmpty(),
    placeholder: placeholder(),
  }));

  const setInputGroupElement = (element: HTMLDivElement | null) => {
    store.set('inputGroupElement', element);
  };

  return useRenderElement('div', componentProps, {
    ref: [setInputGroupElement],
    props: () => [
      {
        role: 'group',
        onMouseDown(event: MouseEvent) {
          handleInputPress(event, store, store.state.disabled, (target) => {
            return contains(store.context.chipsContainerRef.current, target);
          });
        },
      },
      elementProps,
    ],
    state,
    stateAttributesMapping: triggerStateAttributesMapping,
  });
}

export interface ComboboxInputGroupState extends FieldRoot.State {
  /**
   * Whether the corresponding popup is open.
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

export interface ComboboxInputGroupProps extends BaseUIComponentProps<
  'div',
  ComboboxInputGroup.State
> {}

export namespace ComboboxInputGroup {
  export type State = ComboboxInputGroupState;
  export type Props = ComboboxInputGroupProps;
}
