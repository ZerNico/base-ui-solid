import { Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useComboboxItemContext } from '../item/ComboboxItemContext';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { ItemIndicator } from '../../utils/ItemIndicator';

/**
 * Indicates whether the item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxItemIndicator(componentProps: ComboboxItemIndicator.Props): JSX.Element {
  const { selected } = useComboboxItemContext();

  const shouldRender = () => componentProps.keepMounted || selected();

  return (
    <Show when={shouldRender()}>
      <ItemIndicator {...componentProps} selected={selected()} />
    </Show>
  );
}

export interface ComboboxItemIndicatorProps extends BaseUIComponentProps<
  'span',
  ComboboxItemIndicatorState
> {
  children?: JSX.Element | undefined;
  /**
   * Whether to keep the HTML element in the DOM when the item is not selected.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface ComboboxItemIndicatorState {
  /**
   * Whether the item is selected.
   */
  selected: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace ComboboxItemIndicator {
  export type Props = ComboboxItemIndicatorProps;
  export type State = ComboboxItemIndicatorState;
}
