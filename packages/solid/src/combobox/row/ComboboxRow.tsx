import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { ComboboxRowContext } from './ComboboxRowContext';

/**
 * Displays a single row of items in a grid list.
 * Enable `grid` on the root component to turn the listbox into a grid.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxRow(componentProps: ComboboxRow.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  return (
    <ComboboxRowContext value>
      {useRenderElement('div', componentProps, {
        props: () => [{ role: 'row' }, elementProps],
      })}
    </ComboboxRowContext>
  );
}

export interface ComboboxRowState {}

export interface ComboboxRowProps extends BaseUIComponentProps<'div', ComboboxRowState> {}

export namespace ComboboxRow {
  export type State = ComboboxRowState;
  export type Props = ComboboxRowProps;
}
