import { Progress } from 'base-ui-solid/progress';

export function FormattedProgressRoot(props: {
  value: number;
  max: number;
  format: Intl.NumberFormatOptions;
}) {
  return <Progress.Root value={props.value} max={props.max} format={props.format} />;
}
