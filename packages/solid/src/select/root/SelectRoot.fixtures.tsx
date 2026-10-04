import { Select } from '..';

export function SelectWithLabel() {
  return (
    <Select.Root>
      <Select.Label data-testid="label">Font</Select.Label>
      <Select.Trigger data-testid="trigger">
        <Select.Value />
      </Select.Trigger>
    </Select.Root>
  );
}
