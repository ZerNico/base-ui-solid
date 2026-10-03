import { CheckboxGroup } from '.';
import { Checkbox } from '../checkbox';
import { Field } from '../field';

export function SharedFieldRootGroup(props: { nativeButton: boolean }) {
  const checkboxProps = () => ({
    nativeButton: props.nativeButton,
    render: props.nativeButton ? ('button' as const) : undefined,
  });

  return (
    <Field.Root name="apples">
      <Field.Label>Apples</Field.Label>
      <CheckboxGroup allValues={['fuji', 'gala']}>
        <Checkbox.Root parent data-testid="parent" {...checkboxProps()} />
        <Checkbox.Root value="fuji" data-testid="fuji" {...checkboxProps()} />
        <Checkbox.Root value="gala" data-testid="gala" {...checkboxProps()} />
      </CheckboxGroup>
    </Field.Root>
  );
}

export function GroupedCheckboxInFieldItem(props: { nativeButton: boolean; parent: boolean }) {
  return (
    <Field.Root name="apple">
      <CheckboxGroup allValues={['fuji']}>
        <Field.Item>
          <Field.Label data-testid="label">Fuji</Field.Label>
          <Checkbox.Root
            parent={props.parent}
            value={props.parent ? undefined : 'fuji'}
            nativeButton={props.nativeButton}
            render={props.nativeButton ? 'button' : undefined}
          />
        </Field.Item>
      </CheckboxGroup>
    </Field.Root>
  );
}

export function ParentAndChildInFieldItems(props: { nativeButton: boolean }) {
  return (
    <Field.Root name="apple">
      <CheckboxGroup allValues={['fuji']}>
        <Field.Item>
          <Field.Label data-testid="label">All</Field.Label>
          <Checkbox.Root
            parent
            data-testid="parent"
            nativeButton={props.nativeButton}
            render={props.nativeButton ? 'button' : undefined}
          />
        </Field.Item>
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
