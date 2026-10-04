import { omit } from 'solid-js';
import { Fieldset } from 'base-ui-solid/fieldset';

export function Root(props: Fieldset.Root.Props) {
  return <Fieldset.Root {...props} />;
}

export function Legend(componentProps: Fieldset.Legend.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Fieldset.Legend
      class={(state) => [
        'text-sm font-bold text-neutral-950 dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
