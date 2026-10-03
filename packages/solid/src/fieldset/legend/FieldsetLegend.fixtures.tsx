import { Fieldset } from '..';

export function FieldsetWithoutLegend() {
  return <Fieldset.Root data-testid="fieldset" />;
}

export function FieldsetWithLegend() {
  return (
    <Fieldset.Root data-testid="fieldset">
      <Fieldset.Legend data-testid="legend">Legend</Fieldset.Legend>
    </Fieldset.Root>
  );
}
