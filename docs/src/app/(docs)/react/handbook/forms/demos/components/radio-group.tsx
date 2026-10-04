// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { omit } from 'solid-js';
import { RadioGroup as BaseRadioGroup } from 'base-ui-solid/radio-group';

export function RadioGroup<Value>(componentProps: BaseRadioGroup.Props<Value>) {
  const props = omit(componentProps, 'class');
  return (
    <BaseRadioGroup
      class={(state) => [
        'flex w-full flex-row items-start gap-1 text-neutral-950 dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
