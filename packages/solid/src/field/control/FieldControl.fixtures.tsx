import { Field } from '..';

export function AutoFocusApp() {
  return (
    <Field.Root data-testid="root">
      <Field.Label data-testid="label">Name</Field.Label>
      <Field.Control autofocus />
    </Field.Root>
  );
}

export function DefaultValueApp() {
  return (
    <Field.Root>
      <Field.Control data-testid="control" defaultValue="https://example.com" />
    </Field.Root>
  );
}
