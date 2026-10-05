import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useSliderRootContext } from '../root/SliderRootContext';
import type { SliderRootState } from '../root/SliderRoot';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';

/**
 * Contains the slider indicator and represents the entire range of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui-solid.pages.dev/solid/components/slider)
 */
export function SliderTrack(componentProps: SliderTrack.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { state } = useSliderRootContext();

  return useRenderElement('div', componentProps, {
    state,
    props: [
      {
        style: {
          position: 'relative',
        },
      },
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });
}

export interface SliderTrackState extends SliderRootState {}

export interface SliderTrackProps extends BaseUIComponentProps<'div', SliderTrackState> {}

export namespace SliderTrack {
  export type State = SliderTrackState;
  export type Props = SliderTrackProps;
}
