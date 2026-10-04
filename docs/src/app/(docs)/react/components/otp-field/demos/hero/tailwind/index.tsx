import { createUniqueId } from 'solid-js';
import { OTPField } from 'base-ui-solid/otp-field';

const OTP_LENGTH = 6;

export default function ExampleOTPField() {
  const id = createUniqueId();
  const descriptionId = `${id}-description`;

  return (
    <div class="flex w-full max-w-80 flex-col items-start gap-1">
      <label for={id} class="text-sm font-bold text-neutral-950 dark:text-white">
        Verification code
      </label>
      <OTPField.Root
        id={id}
        length={OTP_LENGTH}
        aria-describedby={descriptionId}
        class="flex w-full gap-2"
      >
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <OTPField.Input
            class="m-0 h-10 w-10 rounded-none border border-neutral-950 bg-white dark:bg-neutral-950 text-center font-inherit text-base font-normal text-neutral-950 focus:outline-2 focus:-outline-offset-1 focus:outline-neutral-950 dark:focus:outline-white dark:border-white dark:text-white"
            aria-label={index === 0 ? undefined : `Character ${index + 1} of ${OTP_LENGTH}`}
          />
        ))}
      </OTPField.Root>
      <p id={descriptionId} class="m-0 text-sm text-neutral-600 dark:text-neutral-400">
        Enter the 6-character code we sent to your device.
      </p>
    </div>
  );
}
