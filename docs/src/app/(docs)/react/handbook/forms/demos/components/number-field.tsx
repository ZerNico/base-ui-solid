// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { omit } from 'solid-js';
import { NumberField } from 'base-ui-solid/number-field';

export function Root(componentProps: NumberField.Root.Props) {
  const props = omit(componentProps, 'class');
  return (
    <NumberField.Root
      class={(state) => [
        'flex flex-col items-start gap-1',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Group(componentProps: NumberField.Group.Props) {
  const props = omit(componentProps, 'class');
  return (
    <NumberField.Group
      class={(state) => [
        'flex h-8',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Decrement(componentProps: NumberField.Decrement.Props) {
  const props = omit(componentProps, 'class');
  return (
    <NumberField.Decrement
      class={(state) => [
        'flex h-full w-8 items-center justify-center rounded-none border border-neutral-950 bg-white bg-clip-padding text-neutral-950 outline-0 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:bg-neutral-200 data-disabled:border-neutral-500 data-disabled:text-neutral-500 focus-visible:z-1 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:bg-neutral-700 dark:data-disabled:border-neutral-400 dark:data-disabled:text-neutral-400',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Input(componentProps: NumberField.Input.Props) {
  const props = omit(componentProps, 'class');
  return (
    <NumberField.Input
      ref={componentProps.ref}
      class={(state) => [
        'h-full w-16 rounded-none border-y border-neutral-950 bg-white px-2 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 tabular-nums focus:z-1 focus:outline-2 focus:-outline-offset-1 focus:outline-neutral-950 dark:focus:outline-white dark:border-white dark:bg-neutral-950 dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Increment(componentProps: NumberField.Increment.Props) {
  const props = omit(componentProps, 'class');
  return (
    <NumberField.Increment
      class={(state) => [
        'flex h-full w-8 items-center justify-center rounded-none border border-neutral-950 bg-white bg-clip-padding text-neutral-950 outline-0 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:bg-neutral-200 data-disabled:border-neutral-500 data-disabled:text-neutral-500 focus-visible:z-1 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:not-data-disabled:bg-neutral-800 dark:active:not-data-disabled:bg-neutral-700 dark:data-disabled:border-neutral-400 dark:data-disabled:text-neutral-400',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
