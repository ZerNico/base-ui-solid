import { createUniqueId } from 'solid-js';
import { OTPField } from 'base-ui-solid/otp-field';
import styles from './index.module.css';

const OTP_LENGTH = 6;

export default function ExampleOTPField() {
  const id = createUniqueId();
  const descriptionId = `${id}-description`;

  return (
    <div class={styles.Field}>
      <label for={id} class={styles.Label}>
        Verification code
      </label>
      <OTPField.Root
        id={id}
        length={OTP_LENGTH}
        aria-describedby={descriptionId}
        class={styles.Root}
      >
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <OTPField.Input
            class={styles.Input}
            aria-label={index === 0 ? undefined : `Character ${index + 1} of ${OTP_LENGTH}`}
          />
        ))}
      </OTPField.Root>
      <p id={descriptionId} class={styles.Description}>
        Enter the 6-character code we sent to your device.
      </p>
    </div>
  );
}
