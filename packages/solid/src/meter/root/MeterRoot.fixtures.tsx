import { Meter } from 'base-ui-solid/meter';

export function FormattedMeterRoot(props: {
  value: number;
  max: number;
  format: Intl.NumberFormatOptions;
}) {
  return <Meter.Root value={props.value} max={props.max} format={props.format} />;
}
