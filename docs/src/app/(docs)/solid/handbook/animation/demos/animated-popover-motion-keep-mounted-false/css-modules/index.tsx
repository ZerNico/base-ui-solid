import { createSignal } from 'solid-js';
import { Popover } from 'base-ui-solid/popover';
import styles from './index.module.css';
import { AnimatedPopup } from '../../animated-popup';

export default function AnimatedPopoverDemo() {
  const [open, setOpen] = createSignal(false);
  return (
    <Popover.Root open={open()} onOpenChange={setOpen}>
      <Popover.Trigger class={styles.Trigger}>Trigger</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner class={styles.Positioner} sideOffset={8}>
          <Popover.Popup
            class={styles.Popup}
            render={(props, state) => <AnimatedPopup {...props} open={state.open} />}
          >
            Popup
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
