import { For } from 'solid-js';
import { Toast } from 'base-ui-solid/toast';
import styles from './index.module.css';

interface CustomToastData {
  userId: string;
}
function isCustomToast(
  toast: Toast.Root.ToastObject,
): toast is Toast.Root.ToastObject<CustomToastData> {
  return toast.data?.userId !== undefined;
}
export default function CustomToastExample() {
  return (
    <Toast.Provider>
      <CustomToast />
      <Toast.Portal>
        <Toast.Viewport class={styles.Viewport}>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
function CustomToast() {
  const toastManager = Toast.useToastManager();
  function action() {
    const data: CustomToastData = {
      userId: '123',
    };
    toastManager.add({
      title: 'Toast with custom data',
      data,
    });
  }
  return (
    <button type="button" onClick={action} class={styles.Button}>
      Create custom toast
    </button>
  );
}
function ToastList() {
  const toastManager = Toast.useToastManager();
  return (
    <For each={toastManager.toasts} keyed={(toast) => toast.id}>
      {(toast) => (
        <Toast.Root toast={toast()} class={styles.Toast}>
          <Toast.Content class={styles.Content}>
            <div class={styles.Text}>
              <Toast.Title class={styles.Title}>{toast().title}</Toast.Title>
              {isCustomToast(toast()) && toast().data ? (
                <Toast.Description class={styles.Description}>
                  data.userId is {toast().data.userId}
                </Toast.Description>
              ) : (
                <Toast.Description class={styles.Description} />
              )}
            </div>
            <Toast.Close class={styles.Close}>Dismiss</Toast.Close>
          </Toast.Content>
        </Toast.Root>
      )}
    </For>
  );
}
