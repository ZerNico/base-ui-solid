import { omit } from 'solid-js';
import { Form as BaseForm } from 'base-ui-solid/form';

export function Form(componentProps: BaseForm.Props) {
  const props = omit(componentProps, 'class');
  return (
    <BaseForm
      class={(state) => [
        'flex w-full max-w-3xs flex-col gap-5 sm:max-w-[20rem]',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
