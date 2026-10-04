// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { createSignal, createUniqueId } from 'solid-js';
import { AlertDialog } from 'base-ui-solid/alert-dialog';
import { Dialog } from 'base-ui-solid/dialog';
import styles from './index.module.css';

export default function ExampleDialog() {
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [confirmationOpen, setConfirmationOpen] = createSignal(false);
  const [textareaValue, setTextareaValue] = createSignal('');
  const titleId = createUniqueId();

  return (
    <Dialog.Root
      open={dialogOpen()}
      onOpenChange={(open) => {
        // Show the close confirmation if there’s text in the textarea
        if (!open && textareaValue()) {
          setConfirmationOpen(true);
        } else {
          // Reset the text area value
          setTextareaValue('');
          // Open or close the dialog normally
          setDialogOpen(open);
        }
      }}
    >
      <Dialog.Trigger class={styles.Button}>Tweet</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop class={styles.Backdrop} />
        <Dialog.Popup class={styles.Popup}>
          <div class={styles.PopupBody}>
            <Dialog.Title id={titleId} class={styles.Title}>
              New tweet
            </Dialog.Title>
            <form
              class={styles.TextareaContainer}
              onSubmit={(event) => {
                event.preventDefault();
                // Close the dialog when submitting
                setDialogOpen(false);
              }}
            >
              <textarea
                aria-labelledby={titleId}
                required
                class={styles.Textarea}
                placeholder="What’s on your mind?"
                value={textareaValue()}
                onInput={(event) => setTextareaValue(event.target.value)}
              />
              <div class={styles.Actions}>
                <Dialog.Close class={styles.Button}>Cancel</Dialog.Close>
                <button type="submit" class={styles.Button}>
                  Tweet
                </button>
              </div>
            </form>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>

      {/* Confirmation dialog */}
      <AlertDialog.Root open={confirmationOpen()} onOpenChange={setConfirmationOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Popup class={styles.Popup}>
            <div class={styles.Intro}>
              <AlertDialog.Title class={styles.Title}>Discard tweet?</AlertDialog.Title>
              <AlertDialog.Description class={styles.Description}>
                Your tweet will be lost.
              </AlertDialog.Description>
            </div>
            <div class={styles.Actions}>
              <AlertDialog.Close class={styles.Button}>Go back</AlertDialog.Close>
              <button
                type="button"
                class={styles.Button}
                onClick={() => {
                  setConfirmationOpen(false);
                  setDialogOpen(false);
                }}
              >
                Discard
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Dialog.Root>
  );
}
