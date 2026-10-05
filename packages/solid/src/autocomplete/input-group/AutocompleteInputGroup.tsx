import type { JSX } from '@solidjs/web';
import { ComboboxInputGroup } from '../../combobox/input-group/ComboboxInputGroup';
import type { FieldRoot } from '../../field/root/FieldRoot';
import type { Side } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * A wrapper for the input and its associated controls.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Autocomplete](https://base-ui-solid.pages.dev/solid/components/autocomplete)
 */
export const AutocompleteInputGroup = ComboboxInputGroup as AutocompleteInputGroup;

export interface AutocompleteInputGroupState extends FieldRoot.State {
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
}

export interface AutocompleteInputGroupProps extends BaseUIComponentProps<
  'div',
  AutocompleteInputGroupState
> {}

export interface AutocompleteInputGroup {
  (componentProps: AutocompleteInputGroupProps): JSX.Element;
}

export namespace AutocompleteInputGroup {
  export type State = AutocompleteInputGroupState;
  export type Props = AutocompleteInputGroupProps;
}
