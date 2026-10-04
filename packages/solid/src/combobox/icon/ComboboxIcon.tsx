import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * An icon that indicates that the trigger button opens the popup.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxIcon(componentProps: ComboboxIcon.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const element = useRenderElement('span', componentProps, {
    props: () => [
      {
        'aria-hidden': true,
        children: '▼',
      },
      elementProps,
    ],
  });

  return element;
}

export interface ComboboxIconState {}

export interface ComboboxIconProps extends BaseUIComponentProps<'span', ComboboxIconState> {}

export namespace ComboboxIcon {
  export type State = ComboboxIconState;
  export type Props = ComboboxIconProps;
}
