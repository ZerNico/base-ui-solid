import { omit } from 'solid-js';
import { Radio } from 'base-ui-solid/radio';

export function Root(componentProps: Radio.Root.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Radio.Root
      class={(state) => [
        'flex size-4 shrink-0 items-center justify-center rounded-full border border-neutral-950 bg-white p-0 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white data-checked:bg-neutral-950 data-checked:text-white dark:border-white dark:bg-neutral-950 dark:text-neutral-950 dark:data-checked:bg-white dark:data-checked:text-neutral-950',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Indicator(componentProps: Radio.Indicator.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Radio.Indicator
      class={(state) => [
        'flex items-center justify-center data-unchecked:hidden before:size-2 before:rounded-full before:bg-current',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
