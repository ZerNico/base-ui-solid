import { createSignal, Show } from 'solid-js';
import { Field } from '..';
import { Select } from '../../select';
import { Checkbox } from '../../checkbox';

export function SelectLabelFixture0() {
  return (
    <Field.Root>
      <Select.Root>
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
      </Select.Root>
    </Field.Root>
  );
}
export function SelectLabelFixture1() {
  const [showSelect, setShowSelect] = createSignal(false);

  return (
    <>
      <Field.Root>
        <Field.Label nativeLabel={false} render="div" data-testid="label">
          Label
        </Field.Label>
        <Show when={showSelect()} fallback={<Checkbox.Root data-testid="checkbox" />}>
          <Select.Root>
            <Select.Trigger data-testid="trigger">
              <Select.Value placeholder="Pick one" />
            </Select.Trigger>
          </Select.Root>
        </Show>
      </Field.Root>
      <button type="button" onClick={() => setShowSelect((prev) => !prev)}>
        Toggle
      </button>
    </>
  );
}

export function SelectLabelFixture2() {
  const [showLabel, setShowLabel] = createSignal(true);

  return (
    <>
      <Field.Root>
        <Show when={showLabel()}>
          <Field.Label nativeLabel={false} render="div" data-testid="label">
            Label
          </Field.Label>
        </Show>
        <Select.Root>
          <Select.Trigger data-testid="trigger">
            <Select.Value placeholder="Pick one" />
          </Select.Trigger>
        </Select.Root>
      </Field.Root>
      <button type="button" onClick={() => setShowLabel(false)}>
        Remove Label
      </button>
    </>
  );
}
