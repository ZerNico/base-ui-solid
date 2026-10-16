import { For, createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Toast } from 'base-ui-solid/toast';
import { Button } from 'base-ui-solid/button';
import styles from './index.module.css';

const anchoredToastManager = Toast.createToastManager();
export default function ExampleToast() {
  return (
    <Toast.Provider toastManager={anchoredToastManager}>
      <AnchoredToasts />
      <CopyButton />
    </Toast.Provider>
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
    <Button
      ref={(element) => {
        buttonRef = element;
      }}
      class={styles.CopyButton}
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      disabled={copied()}
      focusableWhenDisabled
    >
      {copied() ? <CheckIcon /> : <ClipboardIcon />}
    </Button>
  );
}
function AnchoredToasts() {
  const toastManager = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport class={styles.Viewport}>
        <For each={toastManager.toasts} keyed={(toast) => toast.id}>
          {(toast) => (
            <Toast.Positioner toast={toast()} class={styles.Positioner}>
              <Toast.Root toast={toast()} class={styles.Toast}>
                <Toast.Content>
                  <Toast.Description class={styles.Description} />
                </Toast.Content>
              </Toast.Root>
            </Toast.Positioner>
          )}
        </For>
      </Toast.Viewport>
    </Toast.Portal>
  );
}
function ClipboardIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
function CheckIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}
