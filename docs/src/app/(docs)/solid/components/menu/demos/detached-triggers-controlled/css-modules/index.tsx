import { createSignal } from 'solid-js';
import { Menu } from 'base-ui-solid/menu';
import styles from '../../_index.module.css';
/* eslint-disable no-console */
const itemGroups = {
  library: [
    { label: 'Add to library', onClick: () => console.log('Adding to library') },
    { label: 'Add to favorites', onClick: () => console.log('Adding to favorites') },
  ],
  playback: [
    { label: 'Play', onClick: () => console.log('Playing') },
    { label: 'Add to queue', onClick: () => console.log('Adding to queue') },
  ],
  share: [
    { label: 'Share', onClick: () => console.log('Sharing') },
    { label: 'Copy link', onClick: () => console.log('Copying link') },
  ],
} as const;
/* eslint-enable no-console */
type MenuKey = keyof typeof itemGroups;
const demoMenu = Menu.createHandle<MenuKey>();
export default function MenuDetachedTriggersControlledDemo() {
  const [open, setOpen] = createSignal(false);
  const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);
  const handleOpenChange = (isOpen: boolean, eventDetails: Menu.Root.ChangeEventDetails) => {
    setOpen(isOpen);
    if (isOpen) {
      setActiveTrigger(eventDetails.trigger?.id ?? null);
    }
  };
  return [
    <div class={styles.Container}>
      <Menu.Trigger
        class={styles.Button}
        handle={demoMenu}
        id="menu-trigger-1"
        payload={'library' as const}
      >
        Library
      </Menu.Trigger>

      <Menu.Trigger
        class={styles.Button}
        handle={demoMenu}
        id="menu-trigger-2"
        payload={'playback' as const}
      >
        Playback
      </Menu.Trigger>

      <Menu.Trigger
        class={styles.Button}
        handle={demoMenu}
        id="menu-trigger-3"
        payload={'share' as const}
      >
        Share
      </Menu.Trigger>

      <button
        type="button"
        class={styles.Button}
        onClick={() => {
          setActiveTrigger('menu-trigger-2');
          setOpen(true);
        }}
      >
        Open playback (controlled)
      </button>
    </div>,
    <Menu.Root
      handle={demoMenu}
      open={open()}
      triggerId={activeTrigger()}
      onOpenChange={handleOpenChange}
    >
      {(state) => (
        <Menu.Portal>
          <Menu.Positioner class={styles.Positioner} sideOffset={8} align="start">
            <Menu.Popup class={styles.Popup}>
              {state.payload &&
                itemGroups[state.payload].map((item) => (
                  <Menu.Item class={styles.Item} onClick={item.onClick}>
                    {item.label}
                  </Menu.Item>
                ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      )}
    </Menu.Root>,
  ];
}
