// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.

import { Dialog } from 'base-ui-solid/dialog';
import { Field } from 'base-ui-solid/field';
import { Fieldset } from 'base-ui-solid/fieldset';
import styles from './index.module.css';

export default function ExampleDialog() {
  const initialFocusRef = { current: null } as { current: HTMLInputElement | null };
  const finalFocusRef = { current: null } as { current: HTMLButtonElement | null };

  return (
    <div class={styles.Container}>
      <Dialog.Root>
        <Dialog.Trigger class={styles.Button}>Open feedback</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop class={styles.Backdrop} />
          <Dialog.Popup
            class={styles.Popup}
            initialFocus={() => initialFocusRef.current}
            finalFocus={() => finalFocusRef.current}
          >
            <div class={styles.Intro}>
              <Dialog.Title class={styles.Title}>Feedback form</Dialog.Title>
              <Dialog.Description class={styles.Description}>
                Your feedback means a lot to us.
              </Dialog.Description>
            </div>
            <Fieldset.Root class={styles.Fieldset}>
              <Field.Root class={styles.Field}>
                <Field.Label class={styles.Label}>Full name</Field.Label>
                <Field.Control placeholder="Enter your name" class={styles.Input} />
              </Field.Root>
              <Field.Root class={styles.Field}>
                <Field.Label class={styles.Label}>Feedback</Field.Label>
                <Field.Control
                  ref={(element) => {
                    initialFocusRef.current = element as HTMLInputElement;
                  }}
                  required
                  placeholder="Enter your feedback"
                  class={styles.Input}
                />
              </Field.Root>
            </Fieldset.Root>
            <div class={styles.Actions}>
              <Dialog.Close class={styles.Button}>Close</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <button
        ref={(element) => {
          finalFocusRef.current = element;
        }}
        type="button"
        class={styles.Button}
      >
        Final focus
      </button>
    </div>
  );
}
