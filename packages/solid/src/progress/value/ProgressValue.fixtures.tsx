import { Loading } from 'solid-js';
import { Progress } from 'base-ui-solid/progress';

// Port note: React's `Suspense` boundary is Solid's `Loading`.
export function FormattedProgressValue(props: {
  value: number;
  max: number;
  format: Intl.NumberFormatOptions;
  suspense: boolean;
}) {
  return (
    <Progress.Root value={props.value} max={props.max} format={props.format}>
      {props.suspense ? (
        <Loading fallback={null}>
          <Progress.Value data-testid="value" />
        </Loading>
      ) : (
        <Progress.Value data-testid="value" />
      )}
    </Progress.Root>
  );
}
