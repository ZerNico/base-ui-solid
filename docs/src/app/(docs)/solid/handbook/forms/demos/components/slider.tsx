import { omit } from 'solid-js';
import { Slider } from 'base-ui-solid/slider';

export function Root(componentProps: Slider.Root.Props<any>) {
  const props = omit(componentProps, 'class');
  return (
    <Slider.Root
      class={(state) => [
        'grid grid-cols-2',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Value(componentProps: Slider.Value.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Slider.Value
      class={(state) => [
        'text-sm font-normal text-neutral-950 dark:text-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Control(componentProps: Slider.Control.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Slider.Control
      class={(state) => [
        'flex col-span-2 touch-none items-center py-3 select-none',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Track(componentProps: Slider.Track.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Slider.Track
      class={(state) => [
        'h-1 w-full bg-neutral-200 select-none dark:bg-neutral-800',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Indicator(componentProps: Slider.Indicator.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Slider.Indicator
      class={(state) => [
        'bg-neutral-950 select-none dark:bg-white',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}

export function Thumb(componentProps: Slider.Thumb.Props) {
  const props = omit(componentProps, 'class');
  return (
    <Slider.Thumb
      class={(state) => [
        'size-4 border border-neutral-950 bg-white select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-950 dark:has-[:focus-visible]:outline-white dark:border-white dark:bg-neutral-950',
        typeof componentProps.class === 'function'
          ? componentProps.class(state)
          : componentProps.class,
      ]}
      {...props}
    />
  );
}
