import type { JSX } from '@solidjs/web';
import { ListboxSeparator } from '../../utils/listbox-separator/ListboxSeparator';
import type { BaseUIComponentProps, Orientation } from '../../internals/types';

export interface ComboboxSeparatorProps extends BaseUIComponentProps<
  'div',
  ComboboxSeparatorState
> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface ComboboxSeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

/**
 * A visual separator between items or groups.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export const ComboboxSeparator = ListboxSeparator as (props: ComboboxSeparatorProps) => JSX.Element;

export namespace ComboboxSeparator {
  export type Props = ComboboxSeparatorProps;
  export type State = ComboboxSeparatorState;
}
