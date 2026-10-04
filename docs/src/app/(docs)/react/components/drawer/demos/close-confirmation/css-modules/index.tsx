import { createSignal, createUniqueId } from 'solid-js';
import { AlertDialog } from 'base-ui-solid/alert-dialog';
import { Drawer } from 'base-ui-solid/drawer';
import styles from './index.module.css';

export default function ExampleDrawer() {
  const [drawerOpen, setDrawerOpen] = createSignal(false);
  const [confirmationOpen, setConfirmationOpen] = createSignal(false);
  const [textareaValue, setTextareaValue] = createSignal('');
  const titleId = createUniqueId();

  return (
    <Drawer.Root
      swipeDirection="right"
      open={drawerOpen()}
      onOpenChange={(open, eventDetails) => {
        // Show the close confirmation if there’s text in the textarea
        if (!open && textareaValue()) {
          eventDetails.cancel();
          setConfirmationOpen(true);
          return;
        }
        if (!open) {
          // Reset the textarea value
          setTextareaValue('');
        }
        setDrawerOpen(open);
      }}
    >
      <Drawer.Trigger class={styles.Button}>Tweet</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop class={styles.Backdrop} />
        <Drawer.Viewport class={styles.Viewport}>
          <Drawer.Popup
            class={`${styles.Popup} ${confirmationOpen() ? styles.PopupDimmed : ''}`.trim()}
          >
            <Drawer.Content class={styles.Content}>
              <Drawer.Title id={titleId} class={styles.Title}>
                New tweet
              </Drawer.Title>
              <form
                class={styles.TextareaContainer}
                onSubmit={(event) => {
                  event.preventDefault();
                  // Close the drawer when submitting
                  setTextareaValue('');
                  setDrawerOpen(false);
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
                  <Drawer.Close class={styles.Button}>Cancel</Drawer.Close>
                  <button type="submit" class={styles.Button}>
                    Tweet
                  </button>
                </div>
              </form>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>

      {/* Confirmation dialog */}
      <AlertDialog.Root open={confirmationOpen()} onOpenChange={setConfirmationOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Popup class={styles.AlertPopup}>
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
                  setTextareaValue('');
                  setDrawerOpen(false);
                }}
              >
                Discard
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Drawer.Root>
  );
}
