import { Field } from '..';

export function AutoFocusApp() {
  return (
    <Field.Root data-testid="root">
      <Field.Label data-testid="label">Name</Field.Label>
      <Field.Control autofocus />
    </Field.Root>
  );
}
