import { omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import type { MeterRootState } from '../root/MeterRoot';
import { useMeterRootContext } from '../root/MeterRootContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Visualizes the position of the value along the range.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui-solid.pages.dev/solid/components/meter)
 */
export function MeterIndicator(componentProps: MeterIndicator.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { percentageValue } = useMeterRootContext();

  return useRenderElement('div', componentProps, {
    props: () => [
      {
        style: {
          'inset-inline-start': 0,
          height: 'inherit',
          width: `${percentageValue()}%`,
        },
      },
      elementProps,
    ],
  });
}

export interface MeterIndicatorState extends MeterRootState {}

export interface MeterIndicatorProps extends BaseUIComponentProps<'div', MeterIndicatorState> {}

export namespace MeterIndicator {
  export type State = MeterIndicatorState;
  export type Props = MeterIndicatorProps;
}
