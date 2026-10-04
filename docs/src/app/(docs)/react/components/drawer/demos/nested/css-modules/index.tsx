import { Drawer } from 'base-ui-solid/drawer';
import styles from './index.module.css';

export default function ExampleDrawerNested() {
  return (
    <Drawer.Root>
      <Drawer.Trigger class={styles.Button}>Open drawer stack</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop class={styles.Backdrop} />
        <Drawer.Viewport class={styles.Viewport}>
          <Drawer.Popup class={styles.Popup}>
            <div class={styles.Handle} />
            <Drawer.Content class={styles.Content}>
              <Drawer.Title class={styles.Title}>Account</Drawer.Title>
              <Drawer.Description class={styles.Description}>
                Nested drawers can be styled to stack, while each drawer remains independently focus
                managed.
              </Drawer.Description>

              <div class={styles.Actions}>
                <div class={styles.ActionsLeft}>
                  <Drawer.Root>
                    <Drawer.Trigger class={styles.Button}>Security settings</Drawer.Trigger>
                    <Drawer.Portal>
                      <Drawer.Viewport class={styles.Viewport}>
                        <Drawer.Popup class={styles.Popup}>
                          <div class={styles.Handle} />
                          <Drawer.Content class={styles.Content}>
                            <Drawer.Title class={styles.Title}>Security</Drawer.Title>
                            <Drawer.Description class={styles.Description}>
                              Review sign-in activity and update your security preferences.
                            </Drawer.Description>

                            <ul class={styles.List}>
                              <li>Passkeys enabled</li>
                              <li>2FA via authenticator app</li>
                              <li>3 signed-in devices</li>
                            </ul>

                            <div class={styles.Actions}>
                              <div class={styles.ActionsLeft}>
                                <Drawer.Root>
                                  <Drawer.Trigger class={styles.Button}>
                                    Advanced options
                                  </Drawer.Trigger>
                                  <Drawer.Portal>
                                    <Drawer.Viewport class={styles.Viewport}>
                                      <Drawer.Popup class={styles.Popup}>
                                        <div class={styles.Handle} />
                                        <Drawer.Content class={styles.Content}>
                                          <Drawer.Title class={styles.Title}>Advanced</Drawer.Title>
                                          <Drawer.Description class={styles.Description}>
                                            This drawer is taller to demonstrate variable-height
                                            stacking.
                                          </Drawer.Description>

                                          <div class={styles.Field}>
                                            <label class={styles.Label} for="device-name">
                                              Device name
                                            </label>
                                            <input
                                              id="device-name"
                                              class={styles.Input}
                                              defaultValue="Personal laptop"
                                            />
                                          </div>

                                          <div class={styles.Field}>
                                            <label class={styles.Label} for="notes">
                                              Notes
                                            </label>
                                            <textarea
                                              id="notes"
                                              class={styles.Textarea}
                                              defaultValue="Rotate recovery codes and revoke older sessions."
                                              rows={3}
                                            />
                                          </div>

                                          <div class={styles.Actions}>
                                            <Drawer.Close class={styles.Button}>Done</Drawer.Close>
                                          </div>
                                        </Drawer.Content>
                                      </Drawer.Popup>
                                    </Drawer.Viewport>
                                  </Drawer.Portal>
                                </Drawer.Root>
                              </div>

                              <Drawer.Close class={styles.Button}>Close</Drawer.Close>
                            </div>
                          </Drawer.Content>
                        </Drawer.Popup>
                      </Drawer.Viewport>
                    </Drawer.Portal>
                  </Drawer.Root>
                </div>

                <Drawer.Close class={styles.Button}>Close</Drawer.Close>
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
