// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.

import type { JSX } from '@solidjs/web';
import { Accordion } from 'base-ui-solid/accordion';

export default function ExampleAccordion() {
  return (
    <Accordion.Root
      multiple
      class="flex w-full max-w-80 flex-col border border-neutral-950 text-neutral-950 dark:border-white dark:text-white"
    >
      <Accordion.Item>
        <Accordion.Header>
          <Accordion.Trigger class="group flex w-full items-center justify-between gap-4 bg-transparent px-3 py-2 text-left text-sm font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:hover:not-data-disabled:bg-neutral-800">
            What is Base UI?
            <PlusIcon class="shrink-0 transition-transform duration-100 ease-[ease-out] group-data-panel-open:rotate-45" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class="h-[var(--accordion-panel-height)] overflow-hidden text-sm transition-[height] duration-150 ease-[ease-out] data-ending-style:h-0 data-starting-style:h-0">
          <div class="px-3 py-2">
            Base UI is a library of high-quality unstyled React components for design systems and
            web apps.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class="border-t border-neutral-950 dark:border-white">
        <Accordion.Header>
          <Accordion.Trigger class="group flex w-full items-center justify-between gap-4 bg-transparent px-3 py-2 text-left text-sm font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:hover:not-data-disabled:bg-neutral-800">
            How do I get started?
            <PlusIcon class="shrink-0 transition-transform duration-100 ease-[ease-out] group-data-panel-open:rotate-45" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class="h-[var(--accordion-panel-height)] overflow-hidden text-sm transition-[height] duration-150 ease-[ease-out] data-ending-style:h-0 data-starting-style:h-0">
          <div class="px-3 py-2">
            Head to the “Quick start” guide in the docs. If you’ve used unstyled libraries before,
            you’ll feel at home.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class="border-t border-neutral-950 dark:border-white">
        <Accordion.Header>
          <Accordion.Trigger class="group flex w-full items-center justify-between gap-4 bg-transparent px-3 py-2 text-left text-sm font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:hover:not-data-disabled:bg-neutral-800">
            Can I use it for my project?
            <PlusIcon class="shrink-0 transition-transform duration-100 ease-[ease-out] group-data-panel-open:rotate-45" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class="h-[var(--accordion-panel-height)] overflow-hidden text-sm transition-[height] duration-150 ease-[ease-out] data-ending-style:h-0 data-starting-style:h-0">
          <div class="px-3 py-2">Of course! Base UI is free and open source.</div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

function PlusIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="square"
      stroke-linejoin="round"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="M1.5 8h13M8 14.5v-13" />
    </svg>
  );
}
