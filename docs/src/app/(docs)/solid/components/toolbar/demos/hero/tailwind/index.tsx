import type { JSX } from '@solidjs/web';
import { Toolbar } from 'base-ui-solid/toolbar';
import { ToggleGroup } from 'base-ui-solid/toggle-group';
import { Toggle } from 'base-ui-solid/toggle';
import { Select } from 'base-ui-solid/select';

export default function ExampleToolbar() {
  return (
    <Toolbar.Root class="flex w-150 items-center gap-px border border-neutral-950 bg-white p-px dark:border-white dark:bg-neutral-950">
      <ToggleGroup class="flex gap-px" aria-label="Alignment">
        <Toolbar.Button
          render={(props) => <Toggle {...props} style={props.style || undefined} />}
          aria-label="Align left"
          value="align-left"
          class="flex h-8 min-w-8 items-center justify-center gap-2 border-0 bg-transparent px-3 font-[inherit] text-sm leading-none whitespace-nowrap font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:not-data-pressed:bg-neutral-200 data-pressed:bg-neutral-950 data-pressed:text-white data-pressed:hover:not-data-disabled:bg-neutral-950 data-pressed:hover:not-data-disabled:text-white dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:not-data-pressed:bg-neutral-700 dark:data-pressed:bg-white dark:data-pressed:text-neutral-950 dark:data-pressed:hover:not-data-disabled:bg-white dark:data-pressed:hover:not-data-disabled:text-neutral-950 focus-visible:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
        >
          Align Left
        </Toolbar.Button>
        <Toolbar.Button
          render={(props) => <Toggle {...props} style={props.style || undefined} />}
          aria-label="Align right"
          value="align-right"
          class="flex h-8 min-w-8 items-center justify-center gap-2 border-0 bg-transparent px-3 font-[inherit] text-sm leading-none whitespace-nowrap font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:not-data-pressed:bg-neutral-200 data-pressed:bg-neutral-950 data-pressed:text-white data-pressed:hover:not-data-disabled:bg-neutral-950 data-pressed:hover:not-data-disabled:text-white dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:not-data-pressed:bg-neutral-700 dark:data-pressed:bg-white dark:data-pressed:text-neutral-950 dark:data-pressed:hover:not-data-disabled:bg-white dark:data-pressed:hover:not-data-disabled:text-neutral-950 focus-visible:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
        >
          Align Right
        </Toolbar.Button>
      </ToggleGroup>
      <Toolbar.Separator class="m-1 h-4 w-px bg-neutral-950 dark:bg-white" />
      <Toolbar.Group class="flex gap-px" aria-label="Numerical format">
        <Toolbar.Button
          class="flex h-8 min-w-8 items-center justify-center gap-2 border-0 bg-transparent font-[inherit] text-sm leading-none whitespace-nowrap font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:not-data-pressed:bg-neutral-200 data-pressed:bg-neutral-950 data-pressed:text-white data-pressed:hover:not-data-disabled:bg-neutral-950 data-pressed:hover:not-data-disabled:text-white dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:not-data-pressed:bg-neutral-700 dark:data-pressed:bg-white dark:data-pressed:text-neutral-950 dark:data-pressed:hover:not-data-disabled:bg-white dark:data-pressed:hover:not-data-disabled:text-neutral-950 focus-visible:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
          aria-label="Format as currency"
        >
          $
        </Toolbar.Button>
        <Toolbar.Button
          class="flex h-8 min-w-8 items-center justify-center gap-2 border-0 bg-transparent font-[inherit] text-sm leading-none whitespace-nowrap font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:not-data-pressed:bg-neutral-200 data-pressed:bg-neutral-950 data-pressed:text-white data-pressed:hover:not-data-disabled:bg-neutral-950 data-pressed:hover:not-data-disabled:text-white dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:not-data-pressed:bg-neutral-700 dark:data-pressed:bg-white dark:data-pressed:text-neutral-950 dark:data-pressed:hover:not-data-disabled:bg-white dark:data-pressed:hover:not-data-disabled:text-neutral-950 focus-visible:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
          aria-label="Format as percent"
        >
          %
        </Toolbar.Button>
      </Toolbar.Group>
      <Toolbar.Separator class="m-1 h-4 w-px bg-neutral-950 dark:bg-white" />
      <Select.Root defaultValue="Helvetica">
        <Toolbar.Button
          render={(props) => <Select.Trigger {...props} style={props.style || undefined} />}
          class="flex h-8 min-w-32 cursor-default items-center justify-between gap-2 border-0 bg-transparent px-2 font-[inherit] text-sm leading-none whitespace-nowrap font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:not-data-pressed:bg-neutral-200 data-pressed:bg-neutral-100 data-pressed:text-neutral-950 dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:not-data-pressed:bg-neutral-700 dark:data-pressed:bg-neutral-800 dark:data-pressed:text-white focus-visible:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
        >
          <Select.Value />
          <Select.Icon>
            <CaretUpDownIcon />
          </Select.Icon>
        </Toolbar.Button>
        <Select.Portal>
          <Select.Positioner class="z-10 outline-none select-none" sideOffset={4}>
            <Select.Popup class="group max-h-[var(--available-height)] min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto border border-neutral-950 bg-white bg-clip-padding text-neutral-950 shadow-[0.25rem_0.25rem_0] shadow-black/12 outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-[side=none]:min-w-[calc(var(--anchor-width)+1.75rem)] data-[side=none]:translate-y-px data-[side=none]:scale-100 data-[side=none]:opacity-100 data-[side=none]:transition-none data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none">
              <Select.Item
                value="Helvetica"
                class="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 py-1.5 pr-4 pl-2.5 text-sm outline-none select-none data-highlighted:bg-neutral-950 data-highlighted:text-white pointer-coarse:py-2.5 dark:data-highlighted:bg-white dark:data-highlighted:text-neutral-950"
              >
                <Select.ItemIndicator class="col-start-1">
                  <CheckIcon />
                </Select.ItemIndicator>
                <Select.ItemText class="col-start-2">Helvetica</Select.ItemText>
              </Select.Item>
              <Select.Item
                value="Arial"
                class="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 py-1.5 pr-4 pl-2.5 text-sm outline-none select-none data-highlighted:bg-neutral-950 data-highlighted:text-white pointer-coarse:py-2.5 dark:data-highlighted:bg-white dark:data-highlighted:text-neutral-950"
              >
                <Select.ItemIndicator class="col-start-1">
                  <CheckIcon />
                </Select.ItemIndicator>
                <Select.ItemText class="col-start-2">Arial</Select.ItemText>
              </Select.Item>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Toolbar.Separator class="m-1 h-4 w-px bg-neutral-950 dark:bg-white" />
      <Toolbar.Link
        class="mr-[0.875rem] ml-auto flex-none self-center font-[inherit] text-sm text-neutral-500 no-underline hover:text-blue-700 dark:text-neutral-400 dark:hover:text-blue-500 focus-visible:outline-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
        href="#"
      >
        Edited 51m ago
      </Toolbar.Link>
    </Toolbar.Root>
  );
}

function CaretUpDownIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="M11 10H5l3 3.5zm0-4H5l3-3.5z" />
    </svg>
  );
}

function CheckIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
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
