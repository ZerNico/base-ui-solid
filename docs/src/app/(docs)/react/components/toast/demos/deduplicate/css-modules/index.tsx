// Port note: keyed toast rows receive accessors and retain their DOM when measurements update.
import { For } from 'solid-js';
import { Toast } from 'base-ui-solid/toast';
import styles from './index.module.css';

export default function PulseToast() {
  return (
    <Toast.Provider>
      <PulseToastButton />
      <Toast.Portal>
        <Toast.Viewport class={styles.Viewport}>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
function PulseToastButton() {
  const toastManager = Toast.useToastManager();
  function createToast() {
    toastManager.add({
      id: 'save-status',
      title: 'Draft saved',
      description: 'Click again while it is visible to replay the pulse.',
    });
  }
  return (
    <button type="button" onClick={createToast} class={styles.Button}>
      Save draft
    </button>
  );
}
function ToastList() {
  const toastManager = Toast.useToastManager();
  return (
    <For each={toastManager.toasts} keyed={(toast) => toast.id}>
      {(toast) => <PulseToastItem toast={toast()} />}
    </For>
  );
}
function PulseToastItem(props: { toast: Toast.Root.ToastObject }) {
  const pulseClass = () => {
    if (!props.toast.updateKey) {
      return undefined;
    }
    return props.toast.updateKey % 2 === 0 ? styles.PulseEven : styles.PulseOdd;
  };
  // Port note: read the updated toast reactively so repeated adds replay the pulse.
  return (
    <Toast.Root toast={props.toast} class={[styles.Toast, pulseClass()]}>
      <Toast.Content class={styles.Content}>
        <div class={styles.Text}>
          <Toast.Title class={styles.Title} />
          <Toast.Description class={styles.Description} />
        </div>
        <Toast.Close class={styles.Close}>Dismiss</Toast.Close>
      </Toast.Content>
    </Toast.Root>
  );
}
