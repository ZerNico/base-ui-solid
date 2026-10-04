import { Dynamic } from '@solidjs/web';
import type { Component } from 'solid-js';
import { Popover } from 'base-ui-solid/popover';
import { Avatar } from 'base-ui-solid/avatar';
import baseStyles from '../../_index.module.css';
import styles from './index.module.css';

const demoPopover = Popover.createHandle<Component>();

export default function PopoverDetachedTriggersFullDemo() {
  return (
    <div class={styles.Container}>
      <Popover.Trigger class={baseStyles.Button} handle={demoPopover} payload={NotificationsPanel}>
        Notifications
      </Popover.Trigger>

      <Popover.Trigger class={baseStyles.Button} handle={demoPopover} payload={ActivityPanel}>
        Activity
      </Popover.Trigger>

      <Popover.Trigger class={baseStyles.Button} handle={demoPopover} payload={ProfilePanel}>
        Profile
      </Popover.Trigger>

      <Popover.Root handle={demoPopover}>
        {(state) => (
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} class={styles.Positioner}>
              <Popover.Popup class={styles.Popup}>
                <Popover.Arrow class={styles.Arrow} />

                <Popover.Viewport class={styles.Viewport}>
                  {state.payload !== undefined && <Dynamic component={state.payload} />}
                </Popover.Viewport>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        )}
      </Popover.Root>
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div class={styles.Stack}>
      <Popover.Title class={styles.Title}>Notifications</Popover.Title>
      <Popover.Description class={styles.Description}>
        You are all caught up. Good job!
      </Popover.Description>
    </div>
  );
}

function ProfilePanel() {
  return (
    <div class={styles.ProfilePanel}>
      <Popover.Title class={styles.Title}>Jason Eventon</Popover.Title>
      <Avatar.Root class={styles.Avatar}>
        <Avatar.Image
          src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
          width="48"
          height="48"
          class={styles.AvatarImage}
        />
      </Avatar.Root>
      <span class={styles.Plan}>Pro plan</span>
      <div class={styles.ProfileActions}>
        <a href="#">Profile settings</a>
        <a href="#">Log out</a>
      </div>
    </div>
  );
}

function ActivityPanel() {
  return (
    <div class={styles.Stack}>
      <Popover.Title class={styles.Title}>Activity</Popover.Title>
      <Popover.Description class={styles.Description}>
        Nothing interesting happened recently.
      </Popover.Description>
    </div>
  );
}
