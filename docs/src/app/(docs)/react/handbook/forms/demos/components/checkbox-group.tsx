// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { omit } from 'solid-js';
import { CheckboxGroup as BaseCheckboxGroup } from 'base-ui-solid/checkbox-group';

export function CheckboxGroup(componentProps: BaseCheckboxGroup.Props) {
  const props = omit(componentProps, 'class');
  return (
    <BaseCheckboxGroup
      class={(state) => [
        'flex flex-col items-start gap-1 text-neutral-950 dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
