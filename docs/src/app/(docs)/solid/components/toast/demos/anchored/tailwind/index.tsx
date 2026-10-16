import { For, createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Toast } from 'base-ui-solid/toast';
import { Button } from 'base-ui-solid/button';

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
      class="flex h-8 w-8 items-center justify-center rounded-none border border-neutral-950 bg-white text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:bg-neutral-200 dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:bg-neutral-700 data-disabled:border-neutral-500 data-disabled:text-neutral-500 disabled:border-neutral-500 disabled:text-neutral-500 dark:data-disabled:border-neutral-400 dark:data-disabled:text-neutral-400 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
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
      <Toast.Viewport class="outline-0">
        <For each={toastManager.toasts} keyed={(toast) => toast.id}>
          {(toast) => (
            <Toast.Positioner toast={toast()} class="z-[calc(1000-var(--toast-index))]">
              <Toast.Root
                toast={toast()}
                class="w-max border border-neutral-950 bg-white px-2 py-1 text-sm text-neutral-950 origin-[var(--transform-origin)] shadow-[0.25rem_0.25rem_0] shadow-black/12 transition-[scale,opacity] duration-100 ease-out data-ending-style:opacity-0 data-ending-style:scale-[0.98] data-starting-style:opacity-0 data-starting-style:scale-[0.98] dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
              >
                <Toast.Content>
                  <Toast.Description />
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
