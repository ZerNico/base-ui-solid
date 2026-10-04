// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { omit } from 'solid-js';
import { Field } from 'base-ui-solid/field';

export function Root(componentProps: Field.Root.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Field.Root
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

export function Label(componentProps: Field.Label.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Field.Label
      class={(state) => [
        'text-sm font-bold text-neutral-950 has-[[role="checkbox"]]:flex has-[[role="checkbox"]]:items-center has-[[role="checkbox"]]:gap-2 has-[[role="checkbox"]]:font-normal has-[[role="radio"]]:flex has-[[role="radio"]]:items-center has-[[role="radio"]]:gap-2 has-[[role="radio"]]:font-normal has-[[role="switch"]]:flex has-[[role="switch"]]:items-center dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Description(componentProps: Field.Description.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Field.Description
      class={(state) => [
        'text-sm text-neutral-600 dark:text-neutral-400',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Control(componentProps: Field.Control.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Field.Control
      ref={componentProps.ref}
      class={(state) => [
        'h-8 w-full max-w-xs border border-neutral-950 bg-white px-2 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 placeholder:text-neutral-500 focus:outline-2 focus:-outline-offset-1 focus:outline-neutral-950 dark:focus:outline-white dark:border-white dark:bg-neutral-950 dark:text-white dark:placeholder:text-neutral-400',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Error(componentProps: Field.Error.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Field.Error
      class={(state) => [
        'text-sm text-red-700 dark:text-red-400',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Item(props: Field.Item.Props) {
  return <Field.Item {...props} />;
}
