import { Loading } from 'solid-js';
import { Slider } from 'base-ui-solid/slider';

// Port note: React's `Suspense` boundary is Solid's `Loading`.
export function FormattedSliderValue(props: {
  defaultValue: number;
  max: number;
  format: Intl.NumberFormatOptions;
  suspense: boolean;
}) {
  return (
    <Slider.Root defaultValue={props.defaultValue} max={props.max} format={props.format}>
      {props.suspense ? (
        <Loading fallback={null}>
          <Slider.Value data-testid="output" />
        </Loading>
      ) : (
        <Slider.Value data-testid="output" />
      )}
    </Slider.Root>
  );
}
