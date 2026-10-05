import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { valueToPercent } from '../../utils/valueToPercent';
import { useIsHydrating } from '../../utils/useIsHydrating';
import { useRenderElement } from '../../internals/useRenderElement';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';

// Port note: Solid style objects use kebab-case property names.
function getIndicatorStyles(
  vertical: boolean,
  range: boolean,
  inset: boolean,
  start: number | undefined,
  end: number | undefined,
  forceHidden: boolean,
): JSX.CSSProperties & Record<string, unknown> {
  const styles: JSX.CSSProperties & Record<string, unknown> = {
    visibility:
      forceHidden || (inset && (start === undefined || (range && end === undefined)))
        ? ('hidden' as const)
        : undefined,
    position: vertical ? 'absolute' : 'relative',
    [vertical ? 'width' : 'height']: 'inherit',
  };

  let startValue: string = `${start ?? 0}%`;
  let sizeValue: string = `${(end ?? 0) - (start ?? 0)}%`;

  if (inset) {
    styles['--start-position'] = startValue;
    startValue = 'var(--start-position)';

    if (range) {
      styles['--relative-size'] = sizeValue;
      sizeValue = 'var(--relative-size)';
    }
  }

  styles[vertical ? 'bottom' : 'inset-inline-start'] = range ? startValue : 0;
  styles[vertical ? 'height' : 'width'] = range ? sizeValue : startValue;

  return styles;
}

/**
 * Visualizes the current value of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui-solid.pages.dev/solid/components/slider)
 */
export function SliderIndicator(componentProps: SliderIndicator.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { indicatorPosition, inset, max, min, orientation, renderBeforeHydration, state, values } =
    useSliderRootContext();

  const isHydrating = useIsHydrating();

  const style = () => {
    const vertical = orientation() === 'vertical';
    const currentValues = values();
    const range = currentValues.length > 1;
    const isInset = inset();

    return getIndicatorStyles(
      vertical,
      range,
      isInset,
      isInset ? indicatorPosition()[0] : valueToPercent(currentValues[0], min(), max()),
      isInset
        ? indicatorPosition()[1]
        : valueToPercent(currentValues[currentValues.length - 1], min(), max()),
      isInset && renderBeforeHydration() && isHydrating(),
    );
  };

  return useRenderElement('div', componentProps, {
    state,
    props: () => [
      {
        'data-base-ui-slider-indicator': renderBeforeHydration() ? '' : undefined,
        // Port note: Solid has no `suppressHydrationWarning`.
        style: style(),
      },
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });
}

export interface SliderIndicatorState extends SliderRootState {}

export interface SliderIndicatorProps extends BaseUIComponentProps<'div', SliderIndicatorState> {}

export namespace SliderIndicator {
  export type State = SliderIndicatorState;
  export type Props = SliderIndicatorProps;
}
