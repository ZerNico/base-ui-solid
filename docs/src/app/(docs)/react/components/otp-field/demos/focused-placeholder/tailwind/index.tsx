// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createUniqueId } from 'solid-js';
import { OTPField } from 'base-ui-solid/otp-field';

const CODE_LENGTH = 6;

export default function OTPFieldFocusedPlaceholderDemo() {
  const id = createUniqueId();
  const descriptionId = `${id}-description`;

  return (
    <div class="flex w-full max-w-80 flex-col items-start gap-1">
      <label for={id} class="text-sm font-bold text-neutral-950 dark:text-white">
        Verification code
      </label>
      <OTPField.Root
        id={id}
        length={CODE_LENGTH}
        aria-describedby={descriptionId}
        class="flex w-full gap-2"
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <OTPField.Input
            class="m-0 h-10 w-10 rounded-none border border-neutral-950 bg-white dark:bg-neutral-950 text-center font-inherit text-base font-normal text-neutral-950 placeholder:text-neutral-500 focus:outline-2 focus:-outline-offset-1 focus:outline-neutral-950 dark:focus:outline-white focus:placeholder:text-transparent dark:border-white dark:text-white dark:placeholder:text-neutral-400"
            placeholder="•"
            aria-label={index === 0 ? undefined : `Character ${index + 1} of ${CODE_LENGTH}`}
          />
        ))}
      </OTPField.Root>
      <p id={descriptionId} class="m-0 text-sm text-neutral-600 dark:text-neutral-400">
        Placeholder hints can stay visible until the active slot is focused.
      </p>
    </div>
  );
}
