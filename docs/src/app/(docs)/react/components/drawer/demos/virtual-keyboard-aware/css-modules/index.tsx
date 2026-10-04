import { For } from 'solid-js';
// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { Drawer } from 'base-ui-solid/drawer';
import styles from './index.module.css';

const fields = [
  ['Name', 'Ada Lovelace'],
  ['Phone', '+1 (555) 123-4567'],
  ['Street address', '12 Computing Way'],
  ['Apartment', 'Unit 4B'],
  ['City', 'San Francisco'],
  ['Postal code', '94107'],
  ['Delivery window', 'After 6 PM'],
  ['Backup contact', 'Grace Hopper'],
];

export default function ExampleDrawerVirtualKeyboardAware() {
  return (
    <Drawer.Root>
      <Drawer.Trigger class={styles.Button}>Open keyboard-aware drawer</Drawer.Trigger>
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          <Drawer.Backdrop class={styles.Backdrop} />
          <Drawer.Viewport class={styles.Viewport}>
            <Drawer.Popup class={styles.Popup}>
              <div class={styles.Header}>
                <div class={styles.Handle} />
                <div class={styles.HeaderActions}>
                  <Drawer.Close class={`${styles.Button} ${styles.HeaderButton}`}>
                    Cancel
                  </Drawer.Close>
                  <Drawer.Title class={styles.Title}>Delivery details</Drawer.Title>
                  <Drawer.Close class={`${styles.Button} ${styles.HeaderButton}`}>
                    Save
                  </Drawer.Close>
                </div>
              </div>

              <Drawer.Content class={styles.Scroll}>
                <div class={styles.Form}>
                  <For each={fields}>
                    {([label, placeholder]) => (
                      <label class={styles.Field}>
                        <span class={styles.FieldLabel}>{label}</span>
                        <input class={styles.Input} placeholder={placeholder} type="text" />
                      </label>
                    )}
                  </For>

                  <label class={styles.Field}>
                    <span class={styles.FieldLabel}>Instructions</span>
                    <textarea
                      class={styles.Textarea}
                      placeholder="Gate code, drop-off spot, or anything else the driver should know"
                    />
                  </label>
                </div>
              </Drawer.Content>

              <div class={styles.FooterSlot}>
                <div class={styles.StickyFooter}>
                  <label class={styles.Composer}>
                    <span class={styles.FieldLabel}>Delivery note</span>
                    <input
                      class={styles.ComposerInput}
                      placeholder="Add a note for the driver"
                      type="text"
                    />
                  </label>
                </div>
              </div>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}
