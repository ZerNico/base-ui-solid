// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { omit } from 'solid-js';
import { Checkbox } from 'base-ui-solid/checkbox';

export function Root(componentProps: Checkbox.Root.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Checkbox.Root
      class={(state) => [
        'flex size-4 shrink-0 items-center justify-center rounded-none border border-neutral-950 bg-white p-0 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white data-checked:bg-neutral-950 data-checked:text-white dark:border-white dark:bg-neutral-950 dark:text-neutral-950 dark:data-checked:bg-white dark:data-checked:text-neutral-950',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Indicator(componentProps: Checkbox.Indicator.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Checkbox.Indicator
      class={(state) => [
        'flex data-unchecked:hidden',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
