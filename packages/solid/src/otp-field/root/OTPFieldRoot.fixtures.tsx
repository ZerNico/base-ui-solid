import { OTPField } from '..';

const OTP_LENGTH = 6;

export function AlphanumericHiddenInput() {
  return (
    <OTPField.Root name="otp" required length={OTP_LENGTH} validationType="alphanumeric">
      <OTPField.Input />
      <OTPField.Input />
      <OTPField.Input />
      <OTPField.Input />
      <OTPField.Input />
      <OTPField.Input />
    </OTPField.Root>
  );
}

export function SlotIds() {
  return (
    <OTPField.Root data-testid="root" id="verification-code" length={OTP_LENGTH}>
      {Array.from({ length: OTP_LENGTH }, () => (
        <OTPField.Input />
      ))}
    </OTPField.Root>
  );
}

export function HiddenInputLength() {
  return (
    <OTPField.Root name="otp" required length={OTP_LENGTH}>
      <OTPField.Input />
      <OTPField.Input />
      <OTPField.Input />
      <OTPField.Input />
      <OTPField.Input />
      <OTPField.Input />
    </OTPField.Root>
  );
}
