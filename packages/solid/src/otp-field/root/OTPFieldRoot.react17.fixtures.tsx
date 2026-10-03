import { OTPField } from '..';

export function TwoSlots() {
  return (
    <OTPField.Root length={2}>
      <OTPField.Input />
      <OTPField.Input />
    </OTPField.Root>
  );
}
