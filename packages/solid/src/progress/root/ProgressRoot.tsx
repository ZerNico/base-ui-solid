import { createMemo, createSignal, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { visuallyHidden } from '@base-ui-solid/utils/visuallyHidden';
import { formatNumber } from '@base-ui-solid/utils/formatNumber';
import { clamp } from '@base-ui-solid/utils/clamp';
import { valueToPercent } from '../../utils/valueToPercent';
import { useRenderElement } from '../../internals/useRenderElement';
import { ProgressRootContext } from './ProgressRootContext';
import { progressStateAttributesMapping } from './stateAttributesMapping';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';

/**
 * Groups all parts of the progress bar and provides the task completion status to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressRoot(componentProps: ProgressRoot.Props) {
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
  const value = () => componentProps.value;

  const [labelId, setLabelId] = createSignal<string | undefined>();

  // `value === null` (or any non-finite value) keeps Progress indeterminate. Otherwise compute a
  // single clamped value and normalized percentage so completion status, `aria-valuenow`, the
  // formatted text, the default `aria-valuetext`, and the indicator width all stay in sync for any
  // `min`/`max` (not just the default 0–100).
  const derived = createMemo(() => {
    const currentValue = value();
    const currentMin = min();
    const currentMax = max();

    let status: ProgressStatus = 'indeterminate';
    let percentageValue: number | null = null;
    let clampedValue: number | null = null;
    let formattedValue = '';
    // Derived alongside `status` so the indeterminate condition is not restated anywhere else.
    let defaultAriaValueText = 'indeterminate progress';

    if (currentValue != null && Number.isFinite(currentValue)) {
      const rawPercentage = valueToPercent(currentValue, currentMin, currentMax);
      percentageValue = clamp(Number.isNaN(rawPercentage) ? 0 : rawPercentage, 0, 100);
      clampedValue = clamp(currentValue, currentMin, currentMax);
      status = clampedValue === currentMax ? 'complete' : 'progressing';
      // Format the clamped value so visible and accessible text stay in sync with `aria-valuenow` and
      // the indicator fill. The raw value remains available as the second `getAriaValueText` argument.
      formattedValue = componentProps.format
        ? formatNumber(clampedValue, componentProps.locale, componentProps.format)
        : formatNumber(percentageValue / 100, componentProps.locale, { style: 'percent' });
      defaultAriaValueText = formattedValue;
    }

    return { status, percentageValue, clampedValue, formattedValue, defaultAriaValueText };
  });

  const status = () => derived().status;
  const formattedValue = () => derived().formattedValue;
  const percentageValue = () => derived().percentageValue;

  const state = createMemo<ProgressRootState>(() => ({ status: status() }));

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
    'aria-valuenow': derived().clampedValue ?? undefined,
    'aria-valuetext': componentProps.getAriaValueText
      ? componentProps.getAriaValueText(formattedValue(), value())
      : derived().defaultAriaValueText,
    role: 'progressbar',
  });

  const contextValue: ProgressRootContext = {
    formattedValue,
    percentageValue,
    setLabelId,
    state,
    value,
  };

  return (
    <ProgressRootContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        state,
        props: () => [childrenProps, defaultProps(), elementProps],
        stateAttributesMapping: progressStateAttributesMapping,
      })}
    </ProgressRootContext>
  );
}

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete';

export interface ProgressRootState {
  /**
   * The current status.
   */
  status: ProgressStatus;
}

export interface ProgressRootProps extends BaseUIComponentProps<'div', ProgressRootState> {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the progress bar.
   */
  'aria-valuetext'?: JSX.AriaAttributes['aria-valuetext'] | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * Accepts a function which returns a string value that provides a human-readable text alternative for the current value of the progress bar.
   */
  getAriaValueText?: ((formattedValue: string, value: number | null) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum value.
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum value.
   * @default 0
   */
  min?: number | undefined;
  /**
   * The current value. The component is indeterminate when value is `null`.
   */
  value: number | null;
}

export namespace ProgressRoot {
  export type State = ProgressRootState;
  export type Props = ProgressRootProps;
}
