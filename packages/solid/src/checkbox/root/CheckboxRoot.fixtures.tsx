import { Checkbox } from '..';
import { Field } from '../../field';

export function IdTestCase(props: { checkboxId?: string | undefined; nativeButton: boolean }) {
  return (
    <Field.Root>
      <Field.Label data-testid="label">Label</Field.Label>
      <Checkbox.Root
        id={props.checkboxId}
        nativeButton={props.nativeButton}
        render={props.nativeButton ? 'button' : undefined}
      />
    </Field.Root>
  );
}
