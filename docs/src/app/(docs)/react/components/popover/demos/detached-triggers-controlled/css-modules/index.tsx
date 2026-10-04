import { createSignal } from 'solid-js';
import { Popover } from 'base-ui-solid/popover';
import styles from '../../_index.module.css';

const demoPopover = Popover.createHandle();
export default function PopoverDetachedTriggersControlledDemo() {
  const [open, setOpen] = createSignal(false);
  const [triggerId, setTriggerId] = createSignal<string | null>(null);
  const handleOpenChange = (isOpen: boolean, eventDetails: Popover.Root.ChangeEventDetails) => {
    setOpen(isOpen);
    setTriggerId(eventDetails.trigger?.id ?? null);
  };
  return [
    <div class={styles.Container}>
      <Popover.Trigger class={styles.Button} handle={demoPopover} id="trigger-1">
        Trigger 1
      </Popover.Trigger>

      <Popover.Trigger class={styles.Button} handle={demoPopover} id="trigger-2">
        Trigger 2
      </Popover.Trigger>

      <Popover.Trigger class={styles.Button} handle={demoPopover} id="trigger-3">
        Trigger 3
      </Popover.Trigger>

      <button
        class={styles.Button}
        type="button"
        onClick={() => {
          setTriggerId('trigger-2');
          setOpen(true);
        }}
      >
        Open programmatically
      </button>
    </div>,
    <Popover.Root
      handle={demoPopover}
      open={open()}
      onOpenChange={handleOpenChange}
      triggerId={triggerId()}
    >
      <Popover.Portal>
        <Popover.Positioner class={styles.Positioner} sideOffset={8}>
          <Popover.Popup class={styles.Popup}>
            <Popover.Arrow class={styles.Arrow} />
            <Popover.Title class={styles.Title}>Notifications</Popover.Title>
            <Popover.Description class={styles.Description}>
              You are all caught up. Good job!
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  ];
}
