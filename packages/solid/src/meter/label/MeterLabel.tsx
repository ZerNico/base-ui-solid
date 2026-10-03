import { omit } from 'solid-js';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';

/**
 * An accessible label for the meter.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterLabel(componentProps: MeterLabel.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const { setLabelId } = useMeterRootContext();

  const id = useRegisteredLabelId(() => componentProps.id as string | undefined, setLabelId);

  return useRenderElement('span', componentProps, {
    props: () => [
      {
        id: id(),
        role: 'presentation',
      },
      elementProps,
    ],
  });
}

export interface MeterLabelState extends MeterRootState {}

export interface MeterLabelProps extends BaseUIComponentProps<'span', MeterLabelState> {}

export namespace MeterLabel {
  export type State = MeterLabelState;
  export type Props = MeterLabelProps;
}
