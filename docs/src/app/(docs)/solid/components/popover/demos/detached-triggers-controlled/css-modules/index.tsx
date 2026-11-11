import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
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
            <Popover.Title class={styles.Title}>Free shipping</Popover.Title>
            <Popover.Description class={styles.Description}>
              Orders over $50 arrive in 3–5 business days at no extra cost.
            </Popover.Description>
            <a href="#" class={styles.Link}>
              View shipping policy
            </a>
            <Popover.Close aria-label="Close" class={styles.Close}>
              <XIcon />
            </Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>,
  ];
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
      <path d="m4.5 4.5 7 7m-7 0 7-7" />
    </svg>
  );
}
