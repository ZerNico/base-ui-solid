import { createMemo, omit, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
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

  // Port note: upstream calls the `children` function on every render. Here it's called once (again
  // only if the function itself changes) with accessors, so its DOM updates in place.
  const childrenProp = createMemo(() => componentProps.children);
  const renderedChildren = createMemo(() => {
    const children = childrenProp();
    return typeof children === 'function'
      ? untrack(() => children(formattedValues, values))
      : undefined;
  });

  const childrenSource = {
    get children(): JSX.Element {
      return typeof childrenProp() === 'function' ? renderedChildren() : defaultDisplayValue();
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
  /**
   * A function called once with accessors of the formatted values and the raw values.
   */
  children?:
    | null
    | ((
        formattedValues: Accessor<readonly string[]>,
        values: Accessor<readonly number[]>,
      ) => JSX.Element)
    | undefined;
}

export namespace SliderValue {
  export type State = SliderValueState;
  export type Props = SliderValueProps;
}
