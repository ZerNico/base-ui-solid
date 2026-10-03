import { Checkbox } from '..';
import { CheckboxGroup } from '../../checkbox-group';
import { Field } from '../../field';

export function FieldItemCheckbox(props: { nativeButton: boolean }) {
  return (
    <Field.Root name="apple">
      <CheckboxGroup allValues={['fuji']}>
        <Field.Item>
          <Field.Label data-testid="label">Fuji</Field.Label>
          <Checkbox.Root
            value="fuji"
            data-testid="fuji"
            nativeButton={props.nativeButton}
            render={props.nativeButton ? 'button' : undefined}
          />
        </Field.Item>
      </CheckboxGroup>
    </Field.Root>
  );
}
