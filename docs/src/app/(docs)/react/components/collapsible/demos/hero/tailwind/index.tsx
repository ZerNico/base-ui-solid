import type { JSX } from '@solidjs/web';
import { Collapsible } from 'base-ui-solid/collapsible';

export default function ExampleCollapsible() {
  return (
    <Collapsible.Root class="flex min-h-36 w-48 flex-col justify-center text-neutral-950 dark:text-white">
      <Collapsible.Trigger class="group flex h-8 items-center justify-between gap-2 rounded-none border border-neutral-950 dark:border-white bg-white dark:bg-neutral-950 pl-3 pr-2 text-sm leading-none whitespace-nowrap font-normal text-neutral-950 dark:text-white select-none hover:not-data-disabled:bg-neutral-100 dark:hover:not-data-disabled:bg-neutral-800 active:not-data-disabled:bg-neutral-200 dark:active:not-data-disabled:bg-neutral-700 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white data-disabled:border-neutral-500 data-disabled:text-neutral-500 disabled:border-neutral-500 disabled:text-neutral-500 dark:data-disabled:border-neutral-400 dark:data-disabled:text-neutral-400">
        Recovery keys
        <CaretRightIcon class="transition-transform duration-100 ease-[ease-out] group-data-panel-open:rotate-90" />
      </Collapsible.Trigger>
      <Collapsible.Panel class="flex h-[var(--collapsible-panel-height)] flex-col justify-end overflow-hidden text-sm transition-[height] duration-150 ease-[ease-out] [&[hidden]:not([hidden='until-found'])]:hidden data-ending-style:h-0 data-starting-style:h-0">
        <div class="flex flex-col gap-2 px-3.5 py-2">
          <div>alien-bean-pasta</div>
          <div>wild-irish-burrito</div>
          <div>horse-battery-staple</div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

export function CaretRightIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: 'block' }}
    >
      <path d="M6 12V4l4.5 4z" />
    </svg>
  );
}
