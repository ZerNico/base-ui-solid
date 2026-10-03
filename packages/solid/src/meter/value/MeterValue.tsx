import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterValue(componentProps: MeterValue.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'children', 'style');

  const { value, formattedValue } = useMeterRootContext();

  return useRenderElement('span', componentProps, {
    props: () => {
      // Port note: read in the props accessor so the children are re-created when they change,
      // like upstream's re-render calls the `children` function again.
      const children = componentProps.children;
      const currentFormattedValue = formattedValue();
      const currentValue = value();
      return [
        {
          'aria-hidden': true,
          get children() {
            return typeof children === 'function'
              ? children(currentFormattedValue, currentValue)
              : currentFormattedValue;
          },
        },
        elementProps,
      ];
    },
  });
}

export interface MeterValueState extends MeterRootState {}

export interface MeterValueProps extends Omit<
  BaseUIComponentProps<'span', MeterValueState>,
  'children'
> {
  children?: null | ((formattedValue: string, value: number) => JSX.Element) | undefined;
}

export namespace MeterValue {
  export type State = MeterValueState;
  export type Props = MeterValueProps;
}
