import { Loading } from 'solid-js';
import { Meter } from 'base-ui-solid/meter';

// Port note: React's `Suspense` boundary is Solid's `Loading`.
export function FormattedMeterValue(props: {
  value: number;
  max: number;
  format: Intl.NumberFormatOptions;
  suspense: boolean;
}) {
  return (
    <Meter.Root value={props.value} max={props.max} format={props.format}>
      {props.suspense ? (
        <Loading fallback={null}>
          <Meter.Value data-testid="value" />
        </Loading>
      ) : (
        <Meter.Value data-testid="value" />
      )}
    </Meter.Root>
  );
}
