import { createMemo, createSignal, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { visuallyHidden } from '@base-ui-solid/utils/visuallyHidden';
import { formatNumber } from '@base-ui-solid/utils/formatNumber';
import { clamp } from '@base-ui-solid/utils/clamp';
import { MeterRootContext } from './MeterRootContext';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { valueToPercent } from '../../utils/valueToPercent';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Groups all parts of the meter and provides the value for screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui-solid.pages.dev/solid/components/meter)
 */
export function MeterRoot(componentProps: MeterRoot.Props) {
  const elementProps = omit(
    componentProps,
    'format',
    'getAriaValueText',
    'locale',
    'max',
    'min',
    'value',
    'render',
    'class',
    'children',
    'style',
  );

  const max = () => componentProps.max ?? 100;
  const min = () => componentProps.min ?? 0;
  const valueProp = () => componentProps.value;

  const [labelId, setLabelId] = createSignal<string | undefined>();

  // `clamp` handles infinity, but NaN needs an explicit fallback before normalizing range outputs.
  const percentageValue = createMemo(() => {
    const rawPercentage = valueToPercent(valueProp(), min(), max());
    return clamp(Number.isNaN(rawPercentage) ? 0 : rawPercentage, 0, 100);
  });
  const clampedValue = createMemo(() =>
    clamp(Number.isNaN(valueProp()) ? min() : valueProp(), min(), max()),
  );

  // Format the clamped value so visible and accessible text stay in sync with `aria-valuenow` and
  // the indicator fill. The raw value remains available as the second `getAriaValueText` argument.
  const formattedValue = createMemo(() =>
    componentProps.format
      ? formatNumber(clampedValue(), componentProps.locale, componentProps.format)
      : formatNumber(percentageValue() / 100, componentProps.locale, { style: 'percent' }),
  );

  const ariaValuetext = () => {
    let text = formattedValue();
    if (componentProps.getAriaValueText) {
      text = componentProps.getAriaValueText(text, valueProp());
    }
    return text;
  };

  // Port note: `children` are provided through a getter on a stable object so they're created once.
  const childrenProps: HTMLProps = {
    get children() {
      return (
        <>
          {componentProps.children}
          <span role="presentation" style={visuallyHidden}>
            {/* force NVDA to read the label https://github.com/mui/base-ui/issues/4184 */}x
          </span>
        </>
      );
    },
  };

  const defaultProps = (): HTMLProps => ({
    'aria-labelledby': labelId(),
    'aria-valuemax': max(),
    'aria-valuemin': min(),
    'aria-valuenow': clampedValue(),
    'aria-valuetext': ariaValuetext(),
    role: 'meter',
  });

  const contextValue: MeterRootContext = {
    formattedValue,
    percentageValue,
    setLabelId,
    value: valueProp,
  };

  return (
    <MeterRootContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        props: () => [childrenProps, defaultProps(), elementProps],
      })}
    </MeterRootContext>
  );
}

export interface MeterRootState {}

export interface MeterRootProps extends BaseUIComponentProps<'div', MeterRootState> {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the meter.
   */
  'aria-valuetext'?: JSX.AriaAttributes['aria-valuetext'] | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * A function that returns a string value that provides a human-readable text alternative for `aria-valuenow`, the current value of the meter.
   */
  getAriaValueText?: ((formattedValue: string, value: number) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum value
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum value
   * @default 0
   */
  min?: number | undefined;
  /**
   * The current value.
   */
  value: number;
}

export namespace MeterRoot {
  export type State = MeterRootState;
  export type Props = MeterRootProps;
}
