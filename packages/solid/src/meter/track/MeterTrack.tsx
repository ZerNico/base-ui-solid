import { omit } from 'solid-js';
import type { MeterRootState } from '../root/MeterRoot';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Contains the meter indicator and represents the entire range of the meter.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterTrack(componentProps: MeterTrack.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  return useRenderElement('div', componentProps, {
    props: elementProps,
  });
}

export interface MeterTrackState extends MeterRootState {}

export interface MeterTrackProps extends BaseUIComponentProps<'div', MeterTrackState> {}

export namespace MeterTrack {
  export type State = MeterTrackState;
  export type Props = MeterTrackProps;
}
