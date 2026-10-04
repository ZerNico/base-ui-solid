// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { omit } from 'solid-js';
import { Switch } from 'base-ui-solid/switch';

export function Root(componentProps: Switch.Root.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Switch.Root
      class={(state) => [
        'flex h-5 w-9 shrink-0 border border-neutral-950 bg-white p-0.5 transition-colors duration-150 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white data-checked:bg-neutral-950 dark:border-white dark:bg-neutral-950 dark:data-checked:bg-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Thumb(componentProps: Switch.Thumb.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Switch.Thumb
      class={(state) => [
        'size-3.5 bg-neutral-950 transition-[translate,background-color] duration-150 ease-[ease] data-checked:translate-x-4 data-checked:bg-white dark:bg-white dark:data-checked:bg-neutral-950',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
