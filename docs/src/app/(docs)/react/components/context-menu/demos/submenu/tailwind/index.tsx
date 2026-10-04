import { mergeProps } from 'base-ui-solid/merge-props';
import type { JSX } from '@solidjs/web';
import { ContextMenu } from 'base-ui-solid/context-menu';

export default function ExampleContextMenu() {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger class="flex aspect-5/3 w-full max-w-64 items-center justify-center rounded-none border border-neutral-950 bg-white text-neutral-950 select-none text-sm dark:border-white dark:bg-neutral-950 dark:text-white">
        Right click here
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner class="outline-hidden">
          <ContextMenu.Popup class={popupClass}>
            <ContextMenu.Item class={itemClass}>Add to Library</ContextMenu.Item>

            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger class={submenuTriggerClass}>
                Add to Playlist <CaretRightIcon />
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner class="outline-hidden" alignOffset={-4} sideOffset={-4}>
                  <ContextMenu.Popup class={popupClass}>
                    <ContextMenu.Item class={itemClass}>Get Up!</ContextMenu.Item>
                    <ContextMenu.Item class={itemClass}>Inside Out</ContextMenu.Item>
                    <ContextMenu.Item class={itemClass}>Night Beats</ContextMenu.Item>
                    <ContextMenu.Separator class="mx-1 my-1 h-px bg-neutral-950 dark:bg-white" />
                    <ContextMenu.Item class={itemClass}>New playlist…</ContextMenu.Item>
                  </ContextMenu.Popup>
                </ContextMenu.Positioner>
              </ContextMenu.Portal>
            </ContextMenu.SubmenuRoot>

            <ContextMenu.Separator class="mx-1 my-1 h-px bg-neutral-950 dark:bg-white" />

            <ContextMenu.Item class={itemClass}>Play Next</ContextMenu.Item>
            <ContextMenu.Item class={itemClass}>Play Last</ContextMenu.Item>
            <ContextMenu.Separator class="mx-1 my-1 h-px bg-neutral-950 dark:bg-white" />
            <ContextMenu.Item class={itemClass}>Favorite</ContextMenu.Item>
            <ContextMenu.Item class={itemClass}>Share</ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

const popupClass =
  'origin-[var(--transform-origin)] border border-neutral-950 bg-white py-1 text-neutral-950 shadow-[0.25rem_0.25rem_0] shadow-black/12 outline-hidden transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none';
const itemClass =
  "flex cursor-default py-2 pr-6 pl-4 text-sm leading-4 outline-hidden select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-white data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-950 data-highlighted:before:content-[''] data-disabled:text-neutral-500 dark:data-highlighted:text-neutral-950 dark:data-highlighted:before:bg-white dark:data-disabled:text-neutral-400";
const submenuTriggerClass =
  "flex cursor-default items-center justify-between gap-4 py-2 pr-2 pl-4 text-sm leading-4 outline-hidden select-none data-popup-open:relative data-popup-open:z-0 data-popup-open:before:absolute data-popup-open:before:inset-x-1 data-popup-open:before:inset-y-0 data-popup-open:before:z-[-1] data-popup-open:before:bg-neutral-100 data-popup-open:before:content-[''] data-highlighted:relative data-highlighted:z-0 data-highlighted:text-white data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-950 data-highlighted:before:content-[''] data-highlighted:data-popup-open:before:bg-neutral-950 data-disabled:text-neutral-500 dark:data-popup-open:before:bg-neutral-800 dark:data-highlighted:text-neutral-950 dark:data-highlighted:before:bg-white dark:data-highlighted:data-popup-open:before:bg-white dark:data-disabled:text-neutral-400";

function CaretRightIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...(mergeProps<JSX.IntrinsicElements['svg']>(
        { style: { display: 'block' } },
        props,
      ) as JSX.IntrinsicElements['svg'])}
    >
      <path d="M6 12V4l4.5 4z" />
    </svg>
  );
}
