import type { JSX } from '@solidjs/web';
// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { Dialog } from 'base-ui-solid/dialog';
import styles from './index.module.css';

export default function ExampleUncontainedDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger class={styles.Button}>Open dialog</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop class={styles.Backdrop} />
        <Dialog.Viewport class={styles.Viewport}>
          <Dialog.Popup class={styles.PopupRoot}>
            <Dialog.Close class={styles.Close} aria-label="Close">
              <XIcon />
            </Dialog.Close>
            <div class={styles.Popup} />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function XIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="square"
      stroke-linejoin="round"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="m2.5 2.5 11 11m-11 0 11-11" />
    </svg>
  );
}
