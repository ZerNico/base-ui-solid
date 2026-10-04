// Port note: keyed toast rows receive accessors and retain their DOM when measurements update.
// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { For, createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Toast } from 'base-ui-solid/toast';
import { Button } from 'base-ui-solid/button';
import { Tooltip } from 'base-ui-solid/tooltip';
import styles from './index.module.css';

const anchoredToastManager = Toast.createToastManager();
const stackedToastManager = Toast.createToastManager();
export default function ExampleToast() {
  return (
    <Tooltip.Provider>
      <Toast.Provider toastManager={anchoredToastManager}>
        <AnchoredToasts />
      </Toast.Provider>
      <Toast.Provider toastManager={stackedToastManager}>
        <StackedToasts />
      </Toast.Provider>

      <div class={styles.ButtonGroup}>
        <CopyButton />
        <StackedToastButton />
      </div>
    </Tooltip.Provider>
  );
}
function StackedToastButton() {
  function createToast() {
    stackedToastManager.add({
      description: 'Copied',
    });
  }
  return (
    <button type="button" class={styles.Button} onClick={createToast}>
      Stacked toast
    </button>
  );
}
function CopyButton() {
  const [copied, setCopied] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;
  function handleCopy() {
    setCopied(true);
    anchoredToastManager.add({
      description: 'Copied',
      positionerProps: {
        anchor: buttonRef,
        sideOffset: 10,
      },
      timeout: 1500,
      onClose() {
        setCopied(false);
      },
    });
  }
  return (
    <Tooltip.Root disabled={copied()}>
      <Tooltip.Trigger
        ref={(element) => {
          buttonRef = element;
        }}
        closeOnClick={false}
        class={styles.CopyButton}
        onClick={handleCopy}
        aria-label="Copy to clipboard"
        render={(props) => (
          <Button
            {...props}
            style={props.style || undefined}
            disabled={copied()}
            focusableWhenDisabled
          />
        )}
      >
        {copied() ? <CheckIcon /> : <ClipboardIcon />}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={10}>
          <Tooltip.Popup class={styles.Tooltip}>
            <Tooltip.Arrow class={styles.Arrow} />
            Copy
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
function AnchoredToasts() {
  const toastManager = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport class={styles.AnchoredViewport}>
        <For each={toastManager.toasts} keyed={(toast) => toast.id}>
          {(toast) => (
            <Toast.Positioner toast={toast()} class={styles.AnchoredPositioner}>
              <Toast.Root toast={toast()} class={styles.AnchoredToast}>
                <Toast.Arrow class={styles.Arrow} />
                <Toast.Content>
                  <Toast.Description class={styles.AnchoredDescription} />
                </Toast.Content>
              </Toast.Root>
            </Toast.Positioner>
          )}
        </For>
      </Toast.Viewport>
    </Toast.Portal>
  );
}
function StackedToasts() {
  const toastManager = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport class={styles.StackedViewport}>
        <For each={toastManager.toasts} keyed={(toast) => toast.id}>
          {(toast) => (
            <Toast.Root toast={toast()} class={styles.StackedToast}>
              <Toast.Content class={styles.Content}>
                <div class={styles.Text}>
                  <Toast.Title class={styles.Title} />
                  <Toast.Description class={styles.Description} />
                </div>
                <Toast.Close class={styles.Close}>Dismiss</Toast.Close>
              </Toast.Content>
            </Toast.Root>
          )}
        </For>
      </Toast.Viewport>
    </Toast.Portal>
  );
}
function ClipboardIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & {
    style?: JSX.CSSProperties;
  },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
function CheckIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & {
    style?: JSX.CSSProperties;
  },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}
