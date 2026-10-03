import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { formatNumber } from '@base-ui-solid/utils/formatNumber';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';

/**
 * Displays the current value of the slider as text.
 * Renders an `<output>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderValue(componentProps: SliderValue.Props): JSX.Element {
  const elementProps = omit(componentProps, 'aria-live', 'render', 'class', 'children', 'style');

  const { thumbMap, state, values, format, locale } = useSliderRootContext();

  const outputFor = () =>
    Array.from(thumbMap().values(), ({ inputId }) => inputId)
      .join(' ')
      .trim() || undefined;

  const formattedValues = createMemo(() =>
    values().map((v) => formatNumber(v, locale(), format())),
  );

  const defaultDisplayValue = () => formattedValues().join(' – ');

  // Port note: a stable children source, so the children are created once and update in place.
  const childrenSource = {
    get children() {
      const children = componentProps.children;
      return typeof children === 'function'
        ? children(formattedValues(), values())
        : defaultDisplayValue();
    },
  };

  return useRenderElement('output', componentProps, {
    state,
    props: () => [
      childrenSource,
      {
        // off by default because it will keep announcing when the slider is being dragged
        // and also when the value is changing (but not yet committed)
        'aria-live': componentProps['aria-live'] ?? 'off',
        for: outputFor(),
      },
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });
}

export interface SliderValueState extends SliderRootState {}

export interface SliderValueProps extends Omit<
  BaseUIComponentProps<'output', SliderValueState>,
  'children'
> {
  children?:
    | null
    | ((formattedValues: readonly string[], values: readonly number[]) => JSX.Element)
    | undefined;
}

export namespace SliderValue {
  export type State = SliderValueState;
  export type Props = SliderValueProps;
}
