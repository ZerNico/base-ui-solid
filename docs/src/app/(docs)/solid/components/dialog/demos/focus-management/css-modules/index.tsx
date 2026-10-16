import { createSignal, createUniqueId } from 'solid-js';
import { Dialog } from 'base-ui-solid/dialog';
import styles from './index.module.css';

export default function ExampleDialog() {
  const [initialFocusElement, setInitialFocusElement] = createSignal<HTMLElement | null>(null);
  const [finalFocusElement, setFinalFocusElement] = createSignal<HTMLElement | null>(null);
  const nameId = createUniqueId();
  const feedbackId = createUniqueId();

  return (
    <div class={styles.Container}>
      <Dialog.Root>
        <Dialog.Trigger class={styles.Button}>Open feedback</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop class={styles.Backdrop} />
          <Dialog.Popup
            class={styles.Popup}
            initialFocus={initialFocusElement()}
            finalFocus={finalFocusElement()}
          >
            <div class={styles.Intro}>
              <Dialog.Title class={styles.Title}>Feedback form</Dialog.Title>
              <Dialog.Description class={styles.Description}>
                Your feedback means a lot to us.
              </Dialog.Description>
            </div>
            <div class={styles.Fields}>
              <div class={styles.Field}>
                <label for={nameId} class={styles.Label}>
                  Full name
                </label>
                <input id={nameId} placeholder="Enter your name" class={styles.Input} />
              </div>
              <div class={styles.Field}>
                <label for={feedbackId} class={styles.Label}>
                  Feedback
                </label>
                <input
                  id={feedbackId}
                  ref={setInitialFocusElement}
                  required
                  placeholder="Enter your feedback"
                  class={styles.Input}
                />
              </div>
            </div>
            <div class={styles.Actions}>
              <Dialog.Close class={styles.Button}>Close</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <button ref={setFinalFocusElement} type="button" class={styles.Button}>
        Final focus
      </button>
    </div>
  );
}
