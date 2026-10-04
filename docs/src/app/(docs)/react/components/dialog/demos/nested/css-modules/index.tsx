// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { Dialog } from 'base-ui-solid/dialog';
import styles from './index.module.css';

export default function ExampleDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger class={styles.Button}>View notifications</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop class={styles.Backdrop} />
        <Dialog.Popup class={styles.Popup}>
          <div class={styles.Intro}>
            <Dialog.Title class={styles.Title}>Notifications</Dialog.Title>
            <Dialog.Description class={styles.Description}>
              You are all caught up. Good job!
            </Dialog.Description>
          </div>
          <div class={styles.Actions}>
            <Dialog.Root>
              <Dialog.Trigger class={styles.Button}>Customize</Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Popup class={styles.Popup}>
                  <div class={styles.Intro}>
                    <Dialog.Title class={styles.Title}>Customize notifications</Dialog.Title>
                    <Dialog.Description class={styles.Description}>
                      Review your settings here.
                    </Dialog.Description>
                  </div>
                  <div class={styles.EndActions}>
                    <Dialog.Close class={styles.Button}>Close</Dialog.Close>
                  </div>
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
