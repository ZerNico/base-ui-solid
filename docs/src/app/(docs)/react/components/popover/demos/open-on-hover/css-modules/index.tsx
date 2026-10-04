// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { Popover } from 'base-ui-solid/popover';
import styles from '../../_index.module.css';

export default function ExamplePopover() {
  return (
    <Popover.Root>
      <Popover.Trigger openOnHover class={styles.Button}>
        Notifications
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup class={styles.Popup}>
            <Popover.Arrow class={styles.Arrow} />
            <Popover.Title class={styles.Title}>Notifications</Popover.Title>
            <Popover.Description class={styles.Description}>
              You are all caught up. Good job!
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
