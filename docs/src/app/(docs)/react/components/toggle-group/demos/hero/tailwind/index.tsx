// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import type { JSX } from '@solidjs/web';
import { Toggle } from 'base-ui-solid/toggle';
import { ToggleGroup } from 'base-ui-solid/toggle-group';

export default function ExampleToggleGroup() {
  return (
    <ToggleGroup
      aria-label="Text alignment"
      defaultValue={['left']}
      class="flex gap-px p-px border border-neutral-950 dark:border-white"
    >
      <Toggle
        aria-label="Align left"
        value="left"
        class="flex size-8 items-center justify-center border-none rounded-none bg-transparent text-neutral-950 dark:text-white select-none hover:not-data-disabled:bg-neutral-100 dark:hover:not-data-disabled:bg-neutral-800 active:not-data-disabled:not-data-pressed:bg-neutral-200 dark:active:not-data-disabled:not-data-pressed:bg-neutral-700 data-pressed:bg-neutral-950 data-pressed:text-white dark:data-pressed:bg-white dark:data-pressed:text-neutral-950 data-pressed:hover:not-data-disabled:bg-neutral-950 data-pressed:hover:not-data-disabled:text-white dark:data-pressed:hover:not-data-disabled:bg-white dark:data-pressed:hover:not-data-disabled:text-neutral-950 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
      >
        <AlignLeftIcon />
      </Toggle>
      <Toggle
        aria-label="Align center"
        value="center"
        class="flex size-8 items-center justify-center border-none rounded-none bg-transparent text-neutral-950 dark:text-white select-none hover:not-data-disabled:bg-neutral-100 dark:hover:not-data-disabled:bg-neutral-800 active:not-data-disabled:not-data-pressed:bg-neutral-200 dark:active:not-data-disabled:not-data-pressed:bg-neutral-700 data-pressed:bg-neutral-950 data-pressed:text-white dark:data-pressed:bg-white dark:data-pressed:text-neutral-950 data-pressed:hover:not-data-disabled:bg-neutral-950 data-pressed:hover:not-data-disabled:text-white dark:data-pressed:hover:not-data-disabled:bg-white dark:data-pressed:hover:not-data-disabled:text-neutral-950 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
      >
        <AlignCenterIcon />
      </Toggle>
      <Toggle
        aria-label="Align right"
        value="right"
        class="flex size-8 items-center justify-center border-none rounded-none bg-transparent text-neutral-950 dark:text-white select-none hover:not-data-disabled:bg-neutral-100 dark:hover:not-data-disabled:bg-neutral-800 active:not-data-disabled:not-data-pressed:bg-neutral-200 dark:active:not-data-disabled:not-data-pressed:bg-neutral-700 data-pressed:bg-neutral-950 data-pressed:text-white dark:data-pressed:bg-white dark:data-pressed:text-neutral-950 data-pressed:hover:not-data-disabled:bg-neutral-950 data-pressed:hover:not-data-disabled:text-white dark:data-pressed:hover:not-data-disabled:bg-white dark:data-pressed:hover:not-data-disabled:text-neutral-950 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
      >
        <AlignRightIcon />
      </Toggle>
    </ToggleGroup>
  );
}

function AlignLeftIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 16 16"
      stroke="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path stroke-linecap="square" stroke-linejoin="round" d="M2.5 4.5h11m-11 7h9M2.5 8h5" />
    </svg>
  );
}

function AlignCenterIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      stroke="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path stroke-linecap="square" stroke-linejoin="round" d="M2.5 4.5h11m-10 7h9M5.5 8h5" />
    </svg>
  );
}

function AlignRightIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      stroke="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path stroke-linecap="square" stroke-linejoin="round" d="M2.5 4.5h11m-9 7h9M8.5 8h5" />
    </svg>
  );
}
