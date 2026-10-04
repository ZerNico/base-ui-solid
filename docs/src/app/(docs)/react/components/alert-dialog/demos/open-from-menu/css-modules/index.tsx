// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { AlertDialog } from 'base-ui-solid/alert-dialog';
import { Menu } from 'base-ui-solid/menu';
import styles from './index.module.css';

export default function ExampleAlertDialog() {
  const [dialogOpen, setDialogOpen] = createSignal(false);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger class={styles.Button}>
          Playlist <CaretDownIcon />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner class={styles.Positioner} sideOffset={8} align="start">
            <Menu.Popup class={styles.MenuPopup}>
              <Menu.Item class={styles.MenuItem}>Play</Menu.Item>
              <Menu.Item class={styles.MenuItem}>Share</Menu.Item>
              <Menu.Separator class={styles.Separator} />
              {/* Open the alert dialog when the menu item is clicked */}
              <Menu.Item class={styles.MenuItem} onClick={() => setDialogOpen(true)}>
                Delete…
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {/* Control the alert dialog state */}
      <AlertDialog.Root open={dialogOpen()} onOpenChange={setDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop class={styles.Backdrop} />
          <AlertDialog.Popup class={styles.DialogPopup}>
            <div class={styles.Intro}>
              <AlertDialog.Title class={styles.Title}>Delete playlist?</AlertDialog.Title>
              <AlertDialog.Description class={styles.Description}>
                You can't undo this action.
              </AlertDialog.Description>
            </div>
            <div class={styles.Actions}>
              <AlertDialog.Close class={styles.Button}>Cancel</AlertDialog.Close>
              <AlertDialog.Close data-color="red" class={styles.Button}>
                Delete
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function CaretDownIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="M12 6H4l4 4.5z" />
    </svg>
  );
}
