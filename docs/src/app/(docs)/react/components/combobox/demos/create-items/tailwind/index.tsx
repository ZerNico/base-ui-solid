// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { createUniqueId } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';

export default function ExampleCreateItemsCombobox() {
  const id = createUniqueId();

  return (
    <Combobox.Root items={items} defaultValue="banana">
      <div class="relative flex flex-col gap-1 text-sm leading-5 font-bold text-neutral-950 dark:text-white">
        <label for={id}>Choose a fruit</label>
        <Combobox.InputGroup class="relative h-8 w-56 border border-neutral-950 bg-white dark:bg-neutral-950 focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-neutral-950 dark:focus-within:outline-white dark:border-white [&>input]:pr-[calc(0.5rem+2rem)] has-[.combobox-clear]:[&>input]:pr-[calc(0.5rem+2rem*2)]">
          <Combobox.Input
            placeholder="e.g. Apple"
            id={id}
            class="h-full w-full border-0 bg-white pl-2 dark:bg-neutral-950 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400 dark:text-white"
          />
          <div class="absolute right-0 bottom-0 flex h-full items-center justify-center text-neutral-500 dark:text-neutral-400">
            <Combobox.Clear
              class="combobox-clear flex h-full w-6 items-center justify-center border-0 bg-transparent p-0 text-neutral-950 dark:text-white"
              aria-label="Clear selection"
            >
              <XIcon />
            </Combobox.Clear>
            <Combobox.Trigger
              class="flex h-full w-6 items-center justify-center border-0 bg-transparent p-0 text-neutral-950 dark:text-white"
              aria-label="Open popup"
            >
              <CaretDownIcon />
            </Combobox.Trigger>
          </div>
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner class="outline-none" sideOffset={4}>
          <Combobox.Popup class="w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] border border-neutral-950 bg-white text-neutral-950 shadow-[0.25rem_0.25rem_0_rgb(0_0_0_/_12%)] transition-[scale,opacity] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none">
            <Combobox.Empty>
              <div class="py-4 pr-4 pl-2 text-sm leading-4 text-neutral-500 dark:text-neutral-400">
                No fruits found.
              </div>
            </Combobox.Empty>
            <Combobox.List class="max-h-[min(22.5rem,var(--available-height))] overflow-y-auto overscroll-contain py-1 scroll-py-1 outline-0 data-empty:p-0">
              {(item) => (
                <Combobox.Item
                  value={item.id}
                  class="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 p-2 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-white data-highlighted:before:absolute data-highlighted:before:inset-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-950 dark:data-highlighted:text-neutral-950 dark:data-highlighted:before:bg-white"
                >
                  <Combobox.ItemIndicator class="col-start-1">
                    <CheckIcon />
                  </Combobox.ItemIndicator>
                  <span class="col-start-2">{item.name}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
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

function XIcon(props: JSX.IntrinsicElements['svg']) {
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
      <path d="m4.5 4.5 7 7m-7 0 7-7" />
    </svg>
  );
}

function CaretDownIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="M12 6H4l4 4.5z" />
    </svg>
  );
}

interface Fruit {
  id: string;
  name: string;
}

const fruits: Fruit[] = [
  { id: 'apple', name: 'Apple' },
  { id: 'banana', name: 'Banana' },
  { id: 'orange', name: 'Orange' },
  { id: 'pineapple', name: 'Pineapple' },
  { id: 'grape', name: 'Grape' },
  { id: 'mango', name: 'Mango' },
  { id: 'strawberry', name: 'Strawberry' },
  { id: 'blueberry', name: 'Blueberry' },
  { id: 'raspberry', name: 'Raspberry' },
  { id: 'blackberry', name: 'Blackberry' },
  { id: 'cherry', name: 'Cherry' },
  { id: 'peach', name: 'Peach' },
  { id: 'pear', name: 'Pear' },
  { id: 'plum', name: 'Plum' },
  { id: 'kiwi', name: 'Kiwi' },
  { id: 'watermelon', name: 'Watermelon' },
];

const items = Combobox.createItems(fruits, {
  getValue: (fruit) => fruit.id,
  getLabel: (fruit) => fruit.name,
});
