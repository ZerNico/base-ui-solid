// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createUniqueId } from 'solid-js';
import { OTPField } from 'base-ui-solid/otp-field';
import { useInvalidFeedback } from '../useInvalidFeedback';
import styles from './index.module.css';

const CODE_LENGTH = 6;

function normalizeRecoveryCode(value: string) {
  return value.toUpperCase();
}

function getInvalidClassName(invalidPulse: number, evenClassName: string, oddClassName: string) {
  if (invalidPulse === 0) {
    return '';
  }

  return invalidPulse % 2 === 0 ? evenClassName : oddClassName;
}

export default function OTPFieldCustomNormalizeDemo() {
  const id = createUniqueId();
  const descriptionId = `${id}-description`;

  const {
    activeInvalidIndex,
    handleValueChange,
    handleValueInvalid,
    invalidPulse,
    setFocusedIndex,
    statusMessage,
  } = useInvalidFeedback();

  const invalidClassName = () =>
    getInvalidClassName(invalidPulse(), styles.InputInvalidB, styles.InputInvalidA);

  return (
    <div class={styles.Field}>
      <label for={id} class={styles.Label}>
        Recovery code
      </label>
      <OTPField.Root
        id={id}
        length={CODE_LENGTH}
        validationType="alphanumeric"
        normalizeValue={normalizeRecoveryCode}
        onValueChange={handleValueChange}
        onValueInvalid={handleValueInvalid}
        aria-describedby={descriptionId}
        class={styles.Root}
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <OTPField.Input
            class={[styles.Input, activeInvalidIndex() === index ? invalidClassName() : undefined]}
            aria-label={index === 0 ? undefined : `Character ${index + 1} of ${CODE_LENGTH}`}
            onFocusIn={() => {
              setFocusedIndex(index);
            }}
          />
        ))}
      </OTPField.Root>
      <p id={descriptionId} class={styles.Description}>
        Letters and digits only. Letters are converted to uppercase.
      </p>
      <span aria-live="polite" class={styles.ScreenReaderOnly}>
        {statusMessage()}
      </span>
    </div>
  );
}
