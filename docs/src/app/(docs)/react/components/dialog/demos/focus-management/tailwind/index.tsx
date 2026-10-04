// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.

import { Dialog } from 'base-ui-solid/dialog';
import { Field } from 'base-ui-solid/field';
import { Fieldset } from 'base-ui-solid/fieldset';

export default function ExampleDialog() {
  const initialFocusRef = { current: null } as { current: HTMLInputElement | null };
  const finalFocusRef = { current: null } as { current: HTMLButtonElement | null };

  return (
    <div class="flex flex-wrap justify-center gap-3">
      <Dialog.Root>
        <Dialog.Trigger class="flex h-8 items-center justify-center gap-2 border border-neutral-950 dark:border-white bg-white dark:bg-neutral-950 px-3 text-sm leading-none whitespace-nowrap font-normal text-neutral-950 dark:text-white select-none hover:not-data-disabled:bg-neutral-100 dark:hover:not-data-disabled:bg-neutral-800 active:not-data-disabled:bg-neutral-200 dark:active:not-data-disabled:bg-neutral-700 data-disabled:border-neutral-500 data-disabled:text-neutral-500 disabled:border-neutral-500 disabled:text-neutral-500 dark:data-disabled:border-neutral-400 dark:data-disabled:text-neutral-400 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white">
          Open feedback
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop class="fixed inset-0 min-h-dvh bg-black opacity-20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:opacity-50 supports-[-webkit-touch-callout:none]:absolute" />
          <Dialog.Popup
            initialFocus={() => initialFocusRef.current}
            finalFocus={() => finalFocusRef.current}
            class="fixed top-1/2 left-1/2 -mt-8 flex w-96 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 bg-white dark:bg-neutral-950 p-4 text-neutral-950 dark:text-white border border-neutral-950 dark:border-white shadow-[0.25rem_0.25rem_0] shadow-black/12 dark:shadow-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
          >
            <div class="flex flex-col gap-1">
              <Dialog.Title class="text-base font-bold">Feedback form</Dialog.Title>
              <Dialog.Description class="text-sm text-neutral-600 dark:text-neutral-400">
                Your feedback means a lot to us.
              </Dialog.Description>
            </div>
            <Fieldset.Root class="flex flex-col gap-3 border-0 p-0 m-0">
              <Field.Root class="flex flex-col items-start gap-1">
                <Field.Label class="text-sm font-normal">Full name</Field.Label>
                <Field.Control
                  placeholder="Enter your name"
                  class="h-8 w-full border border-neutral-950 dark:border-white bg-white dark:bg-neutral-950 px-2 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-2 focus:-outline-offset-1 focus:outline-neutral-950 dark:focus:outline-white"
                />
              </Field.Root>
              <Field.Root class="flex flex-col items-start gap-1">
                <Field.Label class="text-sm font-normal">Feedback</Field.Label>
                <Field.Control
                  ref={(element) => {
                    initialFocusRef.current = element;
                  }}
                  required
                  placeholder="Enter your feedback"
                  class="h-8 w-full border border-neutral-950 dark:border-white bg-white dark:bg-neutral-950 px-2 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-2 focus:-outline-offset-1 focus:outline-neutral-950 dark:focus:outline-white"
                />
              </Field.Root>
            </Fieldset.Root>
            <div class="flex justify-end gap-3">
              <Dialog.Close class="flex h-8 items-center justify-center gap-2 border border-neutral-950 dark:border-white bg-white dark:bg-neutral-950 px-3 text-sm leading-none whitespace-nowrap font-normal text-neutral-950 dark:text-white select-none hover:not-data-disabled:bg-neutral-100 dark:hover:not-data-disabled:bg-neutral-800 active:not-data-disabled:bg-neutral-200 dark:active:not-data-disabled:bg-neutral-700 data-disabled:border-neutral-500 data-disabled:text-neutral-500 disabled:border-neutral-500 disabled:text-neutral-500 dark:data-disabled:border-neutral-400 dark:data-disabled:text-neutral-400 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white">
                Close
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <button
        ref={(element) => {
          finalFocusRef.current = element;
        }}
        type="button"
        class="flex h-8 items-center justify-center gap-2 border border-neutral-950 dark:border-white bg-white dark:bg-neutral-950 px-3 text-sm leading-none whitespace-nowrap font-normal text-neutral-950 dark:text-white select-none hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 disabled:border-neutral-500 disabled:text-neutral-500 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
      >
        Final focus
      </button>
    </div>
  );
}
