import type { JSX } from '@solidjs/web';
import { omit } from 'solid-js';
import { Combobox } from 'base-ui-solid/combobox';

export function Root(props: Combobox.Root.Props<any, any>) {
  return <Combobox.Root {...props} />;
}

export function Input(componentProps: Combobox.Input.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.Input
      ref={componentProps.ref}
      class={(state) => [
        'h-full w-full border-0 bg-white pl-2 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 outline-none placeholder:text-neutral-500 dark:bg-neutral-950 dark:text-white dark:placeholder:text-neutral-400',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function InputGroup(componentProps: Combobox.InputGroup.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.InputGroup
      class={(state) => [
        'relative h-8 w-64 border border-neutral-950 bg-white focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-neutral-950 dark:focus-within:outline-white dark:border-white dark:bg-neutral-950 [&>input]:pr-[2.5rem] has-[.combobox-clear]:[&>input]:pr-[calc(0.5rem+2rem*2)]',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Clear(componentProps: Combobox.Clear.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.Clear
      class={(state) => [
        'combobox-clear flex h-full w-6 items-center justify-center border-0 bg-transparent p-0 text-neutral-950 dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    >
      <XIcon />
    </Combobox.Clear>
  );
}

export function Trigger(componentProps: Combobox.Trigger.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.Trigger
      class={(state) => [
        'flex h-full w-6 items-center justify-center border-0 bg-transparent p-0 text-neutral-950 dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Portal(props: Combobox.Portal.Props) {
  return <Combobox.Portal {...props} />;
}

export function Positioner(componentProps: Combobox.Positioner.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.Positioner
      class={(state) => [
        'outline-none',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      sideOffset={4}
      {...props}
    />
  );
}

export function Popup(componentProps: Combobox.Popup.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.Popup
      class={(state) => [
        'w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) border border-neutral-950 bg-white text-neutral-950 shadow-[0.25rem_0.25rem_0_rgb(0_0_0/12%)] transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Empty(componentProps: Combobox.Empty.Props) {
  const props = omit(componentProps, 'class', 'children');
  return (
    <Combobox.Empty {...props}>
      {componentProps.children ? (
        <div
          class={[
            'py-4 pr-4 pl-2 text-sm leading-4 text-neutral-500 dark:text-neutral-400',
            typeof componentProps.class === 'function'
              ? componentProps.class({})
              : componentProps.class,
          ]}
        >
          {componentProps.children}
        </div>
      ) : null}
    </Combobox.Empty>
  );
}

export function List(componentProps: Combobox.List.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.List
      class={(state) => [
        'outline-0 overflow-y-auto scroll-py-[0.25rem] py-1 overscroll-contain max-h-[min(22.5rem,var(--available-height))] data-empty:p-0',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Item(componentProps: Combobox.Item.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.Item
      class={(state) => [
        'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 p-2 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-white data-highlighted:before:absolute data-highlighted:before:inset-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-950 dark:data-highlighted:text-neutral-950 dark:data-highlighted:before:bg-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function ItemIndicator(componentProps: Combobox.ItemIndicator.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Combobox.ItemIndicator
      class={(state) => [
        'col-start-1',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function CaretDownIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={props.style}
    >
      <path d="M12 6H4l4 4.5z" />
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
      style={props.style}
    >
      <path d="m4.5 4.5 7 7m-7 0 7-7" />
    </svg>
  );
}
