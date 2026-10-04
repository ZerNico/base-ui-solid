// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { omit } from 'solid-js';
import { Select } from 'base-ui-solid/select';

export function Root(props: Select.Root.Props<any>) {
  return <Select.Root {...props} />;
}

export function Label(componentProps: Select.Label.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.Label
      class={(state) => [
        'cursor-default text-sm font-bold text-neutral-950 dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Trigger(componentProps: Select.Trigger.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.Trigger
      class={(state) => [
        'flex h-8 min-w-40 cursor-default items-center justify-between gap-3 border border-neutral-950 bg-white pl-2 pr-1 text-sm font-normal text-neutral-950 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:bg-neutral-200 data-disabled:border-neutral-500 data-disabled:text-neutral-500 data-pressed:bg-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:bg-neutral-700 dark:data-disabled:border-neutral-400 dark:data-disabled:text-neutral-400 dark:data-pressed:bg-neutral-800',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Value(componentProps: Select.Value.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.Value
      class={(state) => [
        'data-placeholder:text-neutral-500 dark:data-placeholder:text-neutral-400',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Icon(props: Select.Icon.Props) {
  return <Select.Icon {...props} />;
}

export function Portal(props: Select.Portal.Props) {
  return <Select.Portal {...props} />;
}

export function Positioner(componentProps: Select.Positioner.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.Positioner
      class={(state) => [
        'outline-none select-none z-10',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      sideOffset={4}
      {...props}
    />
  );
}

export function Popup(componentProps: Select.Popup.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.Popup
      class={(state) => [
        'group min-w-(--anchor-width) origin-(--transform-origin) border border-neutral-950 bg-white bg-clip-padding text-neutral-950 shadow-[0.25rem_0.25rem_0] shadow-black/12 transition-[scale,opacity] duration-100 ease-out data-[side=none]:min-w-[calc(var(--anchor-width)+1.75rem)] data-[side=none]:translate-y-px data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-[side=none]:data-ending-style:transition-none data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100 data-[side=none]:data-starting-style:transition-none dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function ScrollUpArrow(componentProps: Select.ScrollUpArrow.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.ScrollUpArrow
      class={(state) => [
        "top-0 z-1 flex h-4 w-full cursor-default items-center justify-center bg-white text-center text-xs before:absolute data-[side=none]:before:-top-full before:left-0 before:h-full before:w-full before:content-[''] dark:bg-neutral-950",
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function ScrollDownArrow(componentProps: Select.ScrollDownArrow.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.ScrollDownArrow
      class={(state) => [
        "bottom-0 z-1 flex h-4 w-full cursor-default items-center justify-center bg-white text-center text-xs before:absolute before:left-0 before:h-full before:w-full before:content-[''] data-[side=none]:before:-bottom-full dark:bg-neutral-950",
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function List(componentProps: Select.List.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.List
      class={(state) => [
        'relative max-h-(--available-height) overflow-y-auto py-1 scroll-py-6',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Item(componentProps: Select.Item.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.Item
      class={(state) => [
        'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 py-1.5 pr-4 pl-2.5 text-sm outline-none select-none group-data-[side=none]:pr-12 data-highlighted:bg-neutral-950 data-highlighted:text-white dark:data-highlighted:bg-white dark:data-highlighted:text-neutral-950',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function ItemIndicator(componentProps: Select.ItemIndicator.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.ItemIndicator
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

export function ItemText(componentProps: Select.ItemText.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Select.ItemText
      class={(state) => [
        'col-start-2',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
